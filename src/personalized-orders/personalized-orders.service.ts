import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalizedOrder, PersonalizedOrderStatus } from '../entities/personalized-order.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentHoldService } from '../payments/payment-hold.service';

@Injectable()
export class PersonalizedOrdersService {
  constructor(
    @InjectRepository(PersonalizedOrder)
    private readonly personalizedOrdersRepo: Repository<PersonalizedOrder>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly paymentHoldService: PaymentHoldService,
  ) {}

  // Создание персонализированного заказа
  async createPersonalizedOrder(data: {
    customerId: string;
    contractorId: string;
    title: string;
    description: string;
    budget: number;
    fullAddress: string;
    customerPhone: string;
    scheduledDate: Date;
    specialInstructions?: string;
    estimatedDuration?: number;
  }) {
    // Проверяем, что заказчик и исполнитель существуют
    const customer = await this.usersRepo.findOne({ where: { id: data.customerId } });
    const contractor = await this.usersRepo.findOne({ where: { id: data.contractorId } });
    
    if (!customer) throw new NotFoundException('Customer not found');
    if (!contractor) throw new NotFoundException('Contractor not found');
    if (contractor.role !== 'contractor') throw new BadRequestException('User is not a contractor');

    // Создаем маскированные данные
    const maskedAddress = this.maskAddress(data.fullAddress);
    const maskedPhone = this.maskPhone(data.customerPhone);

    // Рассчитываем комиссии на основе уровня исполнителя
    const contractorLevel = contractor.contractorLevel || 'specialist';
    const platformCommission = this.getPlatformCommission(contractorLevel);
    const platformFee = data.budget * platformCommission;
    const contractorFee = data.budget - platformFee;

    // Создаем персонализированный заказ
    const personalizedOrder = this.personalizedOrdersRepo.create({
      customer,
      contractor,
      title: data.title,
      description: data.description,
      budget: data.budget,
      fullAddress: data.fullAddress,
      maskedAddress,
      customerPhone: data.customerPhone,
      maskedPhone,
      scheduledDate: data.scheduledDate,
      specialInstructions: data.specialInstructions,
      estimatedDuration: data.estimatedDuration,
      platformCommission,
      contractorFee,
      platformFee,
      status: PersonalizedOrderStatus.PENDING,
    });

    const savedOrder = await this.personalizedOrdersRepo.save(personalizedOrder);

    return savedOrder;
  }

  // Получение персонализированных заказов для исполнителя
  async getContractorOrders(contractorId: string) {
    return this.personalizedOrdersRepo.find({
      where: { contractor: { id: contractorId } },
      relations: ['customer', 'contractor'],
      order: { createdAt: 'DESC' },
    });
  }

  // Получение персонализированных заказов для заказчика
  async getCustomerOrders(customerId: string) {
    return this.personalizedOrdersRepo.find({
      where: { customer: { id: customerId } },
      relations: ['customer', 'contractor'],
      order: { createdAt: 'DESC' },
    });
  }

  // Завершение заказа исполнителем
  async contractorComplete(orderId: string, contractorId: string) {
    const order = await this.personalizedOrdersRepo.findOne({
      where: { id: orderId },
      relations: ['customer', 'contractor'],
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.contractor.id !== contractorId) {
      throw new BadRequestException('Not authorized to complete this order');
    }
    if (order.status !== PersonalizedOrderStatus.ACTIVE) {
      throw new BadRequestException('Order is not active');
    }

    // Обновляем статус заказа
    order.status = PersonalizedOrderStatus.COMPLETED;
    order.completedAt = new Date();
    await this.personalizedOrdersRepo.save(order);

    // Отправляем уведомление заказчику
    await this.notificationsService.createNotification({
      userId: order.customer.id,
      type: 'personalized_order_completed',
      title: 'Заказ завершен',
      message: `Исполнитель ${order.contractor.fullName} завершил ваш заказ`,
      data: {
        orderId: order.id,
        contractorName: order.contractor.fullName,
      },
    });

    return order;
  }

  // Подтверждение завершения заказчиком
  async customerConfirm(orderId: string, customerId: string) {
    const order = await this.personalizedOrdersRepo.findOne({
      where: { id: orderId },
      relations: ['customer', 'contractor'],
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customer.id !== customerId) {
      throw new BadRequestException('Not authorized to confirm this order');
    }
    if (order.status !== PersonalizedOrderStatus.COMPLETED) {
      throw new BadRequestException('Order is not completed');
    }

    // Освобождаем холд платежа
    await this.paymentHoldService.releaseHold(orderId);

    // Отправляем уведомление исполнителю
    await this.notificationsService.createNotification({
      userId: order.contractor.id,
      type: 'payment_hold_released',
      title: 'Оплата получена',
      message: `Заказчик подтвердил завершение заказа. Оплата в размере ${order.contractorFee} руб. поступила на ваш счет`,
      data: {
        orderId: order.id,
        amount: order.contractorFee,
      },
    });

    return order;
  }

  // Отмена заказа
  async cancelOrder(orderId: string, userId: string, userRole: 'customer' | 'contractor') {
    const order = await this.personalizedOrdersRepo.findOne({
      where: { id: orderId },
      relations: ['customer', 'contractor'],
    });

    if (!order) throw new NotFoundException('Order not found');
    
    if (userRole === 'customer' && order.customer.id !== userId) {
      throw new BadRequestException('Not authorized to cancel this order');
    }
    if (userRole === 'contractor' && order.contractor.id !== userId) {
      throw new BadRequestException('Not authorized to cancel this order');
    }

    // Обновляем статус заказа
    order.status = PersonalizedOrderStatus.CANCELLED;
    await this.personalizedOrdersRepo.save(order);

    // Отменяем холд платежа
    await this.paymentHoldService.cancelHold(orderId);

    return order;
  }

  // Вспомогательные методы
  private maskAddress(address: string): string {
    // Маскируем адрес, оставляя только город и улицу
    const parts = address.split(',');
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[1]}, ***`;
    }
    return address;
  }

  private maskPhone(phone: string): string {
    // Маскируем телефон, оставляя только первые 3 и последние 2 цифры
    if (phone.length >= 5) {
      return phone.substring(0, 3) + '***' + phone.substring(phone.length - 2);
    }
    return phone;
  }

  private getPlatformCommission(contractorLevel: string): number {
    switch (contractorLevel) {
      case 'expert': return 0.10; // 10%
      case 'professional': return 0.12; // 12%
      case 'specialist': 
      default: return 0.15; // 15%
    }
  }
}
