import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentHold, PaymentHoldStatus } from '../entities/payment-hold.entity';
import { PersonalizedOrder } from '../entities/personalized-order.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { YooKassaService } from './yookassa.service';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class PaymentHoldService {
  constructor(
    @InjectRepository(PaymentHold)
    private readonly paymentHoldsRepo: Repository<PaymentHold>,
    @InjectRepository(PersonalizedOrder)
    private readonly personalizedOrdersRepo: Repository<PersonalizedOrder>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly yooKassaService: YooKassaService,
  ) {}

  // Создание холда платежа
  async createHold(data: {
    personalizedOrderId: string;
    customerId: string;
    amount: number;
  }) {
    // Проверяем, что персонализированный заказ существует
    const personalizedOrder = await this.personalizedOrdersRepo.findOne({
      where: { id: data.personalizedOrderId },
      relations: ['customer', 'contractor'],
    });
    
    if (!personalizedOrder) throw new NotFoundException('Personalized order not found');
    if (personalizedOrder.customer.id !== data.customerId) {
      throw new BadRequestException('Not authorized to create hold for this order');
    }

    // Проверяем, что нет активного холда для этого заказа
    const existingHold = await this.paymentHoldsRepo.findOne({
      where: { 
        personalizedOrderId: data.personalizedOrderId,
        status: PaymentHoldStatus.HELD 
      }
    });
    if (existingHold) {
      throw new BadRequestException('Hold already exists for this order');
    }

    try {
      // Создаем холд в YooKassa
      const yooKassaPayment = await this.yooKassaService.createHold({
        amount: data.amount,
        description: `Холд для заказа: ${personalizedOrder.title}`,
        metadata: {
          personalizedOrderId: data.personalizedOrderId,
          customerId: data.customerId,
          contractorId: personalizedOrder.contractor.id,
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
      });

      // Создаем холд платежа в БД
      const paymentHold = this.paymentHoldsRepo.create({
        personalizedOrderId: data.personalizedOrderId,
        customer: personalizedOrder.customer,
        amount: data.amount,
        description: `Холд для заказа: ${personalizedOrder.title}`,
        status: PaymentHoldStatus.HELD,
        paymentId: yooKassaPayment.id,
        holdId: yooKassaPayment.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
      });

      const savedHold = await this.paymentHoldsRepo.save(paymentHold);

      // Отправляем уведомление заказчику
      await this.notificationsService.createNotification({
        userId: personalizedOrder.customer.id,
        type: NotificationType.PAYMENT_HOLD_CREATED,
        title: 'Платеж заблокирован',
        message: `С вашей карты заблокирована сумма ${data.amount} руб. для заказа`,
        data: {
          holdId: savedHold.id,
          amount: data.amount,
          orderTitle: personalizedOrder.title,
          paymentUrl: (yooKassaPayment as any).confirmation?.confirmation_url,
        },
      });

      return savedHold;
    } catch (error) {
      console.error('Ошибка создания холда в YooKassa:', error);
      throw new BadRequestException('Не удалось создать холд платежа');
    }
  }

  // Освобождение холда платежа
  async releaseHold(personalizedOrderId: string) {
    const hold = await this.paymentHoldsRepo.findOne({
      where: { 
        personalizedOrderId,
        status: PaymentHoldStatus.HELD 
      },
      relations: ['customer'],
    });

    if (!hold) throw new NotFoundException('Active hold not found');

    try {
      // Подтверждаем холд в YooKassa (списываем средства)
      const yooKassaPayment = await this.yooKassaService.captureHold(hold.paymentId!);

      if (!this.yooKassaService.isPaymentSuccessful(yooKassaPayment)) {
        throw new BadRequestException('Не удалось списать средства с карты');
      }

      // Обновляем статус холда
      hold.status = PaymentHoldStatus.RELEASED;
      hold.releasedAt = new Date();
      await this.paymentHoldsRepo.save(hold);

      // Отправляем уведомление заказчику
      await this.notificationsService.createNotification({
        userId: hold.customer.id,
        type: NotificationType.PAYMENT_HOLD_RELEASED,
        title: 'Платеж списан',
        message: `С вашей карты списана сумма ${hold.amount} руб. за выполненный заказ`,
        data: {
          holdId: hold.id,
          amount: hold.amount,
        },
      });

      return hold;
    } catch (error) {
      console.error('Ошибка освобождения холда в YooKassa:', error);
      throw new BadRequestException('Не удалось списать средства с карты');
    }
  }

  // Отмена холда платежа
  async cancelHold(personalizedOrderId: string) {
    const hold = await this.paymentHoldsRepo.findOne({
      where: { 
        personalizedOrderId,
        status: PaymentHoldStatus.HELD 
      },
      relations: ['customer'],
    });

    if (!hold) throw new NotFoundException('Active hold not found');

    try {
      // Отменяем холд в YooKassa (возвращаем средства)
      const yooKassaPayment = await this.yooKassaService.cancelHold(hold.paymentId!);

      // Обновляем статус холда
      hold.status = PaymentHoldStatus.CANCELLED;
      await this.paymentHoldsRepo.save(hold);

      // Отправляем уведомление заказчику
      await this.notificationsService.createNotification({
        userId: hold.customer.id,
        type: NotificationType.PAYMENT_HOLD_RELEASED,
        title: 'Платеж разблокирован',
        message: `Заблокированная сумма ${hold.amount} руб. возвращена на вашу карту`,
        data: {
          holdId: hold.id,
          amount: hold.amount,
        },
      });

      return hold;
    } catch (error) {
      console.error('Ошибка отмены холда в YooKassa:', error);
      throw new BadRequestException('Не удалось отменить холд платежа');
    }
  }

  // Получение холдов для заказчика
  async getCustomerHolds(customerId: string) {
    return this.paymentHoldsRepo.find({
      where: { customer: { id: customerId } },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });
  }

  // Получение холда по ID
  async getHoldById(holdId: string) {
    return this.paymentHoldsRepo.findOne({
      where: { id: holdId },
      relations: ['customer'],
    });
  }
}
