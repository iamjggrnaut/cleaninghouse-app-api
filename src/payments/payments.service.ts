import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import { Payout, PayoutStatus } from './payout.entity';
import { PaymentMethod } from './payment-method.entity';
import { Transaction, TransactionType } from './transaction.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { User, UserRole } from '../entities/user.entity';
import { YooKassaService } from './yookassa.service';

const MAX_PAYOUT_RETRIES = 5;
const RETRY_DELAYS = [60, 300, 900, 3600, 7200]; // seconds: 1min, 5min, 15min, 1h, 2h
const COMMISSION_RATE = 0.10; // 10% комиссия платформы

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(Payout) private readonly payoutsRepo: Repository<Payout>,
    @InjectRepository(PaymentMethod) private readonly methodsRepo: Repository<PaymentMethod>,
    @InjectRepository(Transaction) private readonly transactionsRepo: Repository<Transaction>,
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly yookassa: YooKassaService,
  ) {}

  async create(data: { orderId: string; userId: string; amount: number }) {
    const order = await this.ordersRepo.findOne({ 
      where: { id: data.orderId },
      relations: ['contractor'],
    });
    if (!order) throw new NotFoundException('Order not found');
    const user = await this.usersRepo.findOne({ where: { id: data.userId } });
    if (!user) throw new NotFoundException('User not found');

    // Проверяем, нет ли уже активного платежа
    const existingPayment = await this.paymentsRepo.findOne({
      where: { 
        order: { id: data.orderId },
        status: PaymentStatus.PENDING as any,
      },
    });
    
    if (existingPayment) {
      return existingPayment;
    }

    const commission = Math.round(data.amount * COMMISSION_RATE);
    const total = data.amount + commission;

    // Создаем платеж в YooKassa (hold)
    const yookassaPayment = await this.yookassa.createHold({
      amount: total,
      description: `Оплата заказа #${order.id.substring(0, 8)}`,
      metadata: { orderId: order.id },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
    });

    const payment = this.paymentsRepo.create({
      order,
      user,
      amount: data.amount,
      commission,
      total,
      status: PaymentStatus.PENDING,
      yookassaPaymentId: yookassaPayment.id,
      yookassaConfirmationUrl: (yookassaPayment as any).confirmation?.confirmation_url || undefined,
    });
    
    return this.paymentsRepo.save(payment) as unknown as Payment;
  }

  findById(id: string) {
    return this.paymentsRepo.findOne({ where: { id } });
  }

  async webhookMock(id: string, status: PaymentStatus) {
    const payment = await this.findById(id);
    if (!payment) throw new NotFoundException('Payment not found');
    payment.status = status;
    await this.paymentsRepo.save(payment);

    if (status === PaymentStatus.SUCCEEDED) {
      const order = await this.ordersRepo.findOne({ where: { id: payment.order.id } });
      if (order) {
        order.status = OrderStatus.COMPLETED;
        await this.ordersRepo.save(order);
      }
    }
    return payment;
  }

  async capture(id: string) {
    const payment = await this.paymentsRepo.findOne({
      where: { id },
      relations: ['order', 'order.contractor'],
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.PROCESSING) {
      throw new BadRequestException('Payment cannot be captured');
    }

    // Подтверждаем платеж в YooKassa (списываем деньги с холда)
    try {
      if (!payment.yookassaPaymentId) {
        throw new Error('Payment ID not found');
      }
      
      const yookassaPayment = await this.yookassa.captureHold(
        payment.yookassaPaymentId,
      );

      payment.status = PaymentStatus.SUCCEEDED;
      await this.paymentsRepo.save(payment);

      const order = payment.order;
      if (order) {
        order.status = OrderStatus.COMPLETED;
        await this.ordersRepo.save(order);

        // Auto-payout to contractor
        if (order.contractor) {
          await this.createPayout(payment, order.contractor);
        }
      }

      return payment;
    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentsRepo.save(payment);
      throw new BadRequestException(`Failed to capture payment: ${error.message}`);
    }
  }

  private async createPayout(payment: Payment, contractor: User) {
    const payoutAmount = payment.amount; // Amount after commission already deducted
    const idempotencyKey = `payout_${payment.id}_${contractor.id}`;

    // Check if payout already exists (idempotency)
    const existing = await this.payoutsRepo.findOne({ where: { idempotencyKey } });
    if (existing) {
      console.log('[Payout] Already exists, skipping:', idempotencyKey);
      return existing;
    }

    const payout = this.payoutsRepo.create({
      payment,
      contractor,
      amount: payoutAmount,
      status: PayoutStatus.PENDING,
      idempotencyKey,
      retryCount: 0,
    });

    const saved = await this.payoutsRepo.save(payout);

    // Trigger payout processing (async)
    this.processPayout(saved.id).catch(err => {
      console.error('[Payout] Error processing:', err);
    });

    return saved;
  }

  private async processPayout(payoutId: string) {
    const payout = await this.payoutsRepo.findOne({ where: { id: payoutId } });
    if (!payout) return;

    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.FAILED) {
      return; // Already processed or processing
    }

    payout.status = PayoutStatus.PROCESSING;
    await this.payoutsRepo.save(payout);

    try {
      // MOCK: call YooKassa Payouts API or SBP
      // In production:
      // const result = await this.yookassaClient.payouts.create({
      //   amount: { value: payout.amount / 100, currency: 'RUB' },
      //   payout_destination_data: { type: 'sbp', phone: payout.contractor.phone },
      //   description: `Payout for order ${payout.payment.order.id}`,
      // });
      // payout.yookassaPayoutId = result.id;

      console.log('[Payout] MOCK: sending payout', payout.amount, 'to', payout.contractor.phone);

      // Simulate success
      payout.status = PayoutStatus.SUCCEEDED;
      payout.yookassaPayoutId = `payout_mock_${Date.now()}`;
      await this.payoutsRepo.save(payout);

      console.log('[Payout] SUCCESS:', payout.id);
    } catch (error: any) {
      console.error('[Payout] FAILED:', error);

      payout.status = PayoutStatus.FAILED;
      payout.errorMessage = error.message || 'Unknown error';
      payout.retryCount += 1;

      if (payout.retryCount < MAX_PAYOUT_RETRIES) {
        const delaySeconds = RETRY_DELAYS[payout.retryCount - 1] || 7200;
        payout.nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
        console.log('[Payout] Scheduled retry', payout.retryCount, 'at', payout.nextRetryAt);
      } else {
        payout.status = PayoutStatus.CANCELLED;
        console.log('[Payout] Max retries reached, cancelled:', payout.id);
      }

      await this.payoutsRepo.save(payout);
    }
  }

  // Retry failed payouts (to be called by cron job)
  async retryFailedPayouts() {
    const now = new Date();
    const failedPayouts = await this.payoutsRepo.find({
      where: { status: PayoutStatus.FAILED },
    });

    for (const payout of failedPayouts) {
      if (payout.nextRetryAt && payout.nextRetryAt <= now) {
        console.log('[Payout] Retrying:', payout.id);
        await this.processPayout(payout.id);
      }
    }
  }

  // Payment methods
  async savePaymentMethod(userId: string, data: { yookassaPaymentMethodId: string; cardLast4: string; cardType: string }) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const method = this.methodsRepo.create({
      user,
      yookassaPaymentMethodId: data.yookassaPaymentMethodId,
      cardLast4: data.cardLast4,
      cardType: data.cardType,
      isDefault: false,
    });

    return this.methodsRepo.save(method);
  }

  async getPaymentMethods(userId: string) {
    return this.methodsRepo.find({ where: { user: { id: userId } } });
  }

  async setDefaultPaymentMethod(userId: string, methodId: string) {
    await this.methodsRepo.update({ user: { id: userId } }, { isDefault: false });
    await this.methodsRepo.update({ id: methodId }, { isDefault: true });
    return this.methodsRepo.findOne({ where: { id: methodId } });
  }

  async deletePaymentMethod(methodId: string) {
    return this.methodsRepo.delete({ id: methodId });
  }

  // Balance and transactions
  async getBalance(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Calculate balance from successful payouts
    const payouts = await this.payoutsRepo.find({
      where: { contractor: { id: userId }, status: PayoutStatus.SUCCEEDED },
    });

    const totalEarned = payouts.reduce((sum, payout) => sum + payout.amount, 0);

    // In production, track withdrawals and calculate available balance
    const availableBalance = totalEarned; // Simplified: no withdrawals yet

    return {
      totalEarned,
      availableBalance,
      currency: 'RUB',
    };
  }

  async getTransactions(userId: string, limit = 20) {
    return this.transactionsRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async createTransaction(data: { userId: string; orderId?: string; type: TransactionType; amount: number; description?: string }) {
    const user = await this.usersRepo.findOne({ where: { id: data.userId } });
    if (!user) throw new NotFoundException('User not found');

    const order = data.orderId ? await this.ordersRepo.findOne({ where: { id: data.orderId } }) : null;

    const transaction = this.transactionsRepo.create({
      user,
      ...(order ? { order } : {}),
      type: data.type,
      amount: data.amount,
      description: data.description,
    });

    return this.transactionsRepo.save(transaction);
  }
}
