import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderResponse, ResponseStatus } from '../entities/order-response.entity';
import { Order } from '../entities/order.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrderResponsesService {
  constructor(
    @InjectRepository(OrderResponse)
    private readonly responsesRepo: Repository<OrderResponse>,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Исполнитель откликается на заказ
  async createResponse(data: {
    orderId: string;
    contractorId: string;
    message?: string;
    proposedPrice?: number;
    estimatedDuration?: number;
  }): Promise<OrderResponse> {
    const order = await this.ordersRepo.findOne({
      where: { id: data.orderId },
      relations: ['customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Проверка: заказ должен быть открыт
    if (order.status !== 'open') {
      throw new BadRequestException('Order is not open for responses');
    }

    // Проверка: исполнитель не может откликнуться дважды
    const existingResponse = await this.responsesRepo.findOne({
      where: {
        orderId: data.orderId,
        contractorId: data.contractorId,
        status: ResponseStatus.PENDING,
      },
    });

    if (existingResponse) {
      throw new BadRequestException('You already responded to this order');
    }

    const contractor = await this.usersRepo.findOne({
      where: { id: data.contractorId },
    });

    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }

    const response = this.responsesRepo.create({
      orderId: data.orderId,
      order,
      contractorId: data.contractorId,
      contractor,
      message: data.message,
      proposedPrice: data.proposedPrice,
      estimatedDuration: data.estimatedDuration,
    });

    const saved = await this.responsesRepo.save(response) as unknown as OrderResponse;

    // Изменяем статус заказа на "ожидает принятия"
    await this.ordersRepo.update(order.id, { 
      status: 'pending' as any,
      contractorId: contractor.id 
    });

    // Уведомление клиенту о новом отклике
    await this.notificationsService.notifyOrderResponse(
      order.id,
      order.customer.id,
      contractor.fullName,
    );

    return saved;
  }

  // Получить все отклики на заказ (для клиента)
  async getResponsesByOrder(orderId: string): Promise<OrderResponse[]> {
    return this.responsesRepo.find({
      where: { orderId },
      relations: ['contractor'],
      order: { createdAt: 'DESC' as any },
    });
  }

  // Получить отклики исполнителя
  async getResponsesByContractor(contractorId: string): Promise<OrderResponse[]> {
    return this.responsesRepo.find({
      where: { contractorId },
      relations: ['order', 'order.customer'],
      order: { createdAt: 'DESC' as any },
    });
  }

  // Клиент принимает отклик (назначает исполнителя)
  async acceptResponse(responseId: string, customerId: string): Promise<Order> {
    const response = await this.responsesRepo.findOne({
      where: { id: responseId },
      relations: ['order', 'order.customer', 'contractor'],
    });

    if (!response) {
      throw new NotFoundException('Response not found');
    }

    if (response.order.customer.id !== customerId) {
      throw new BadRequestException('Not authorized');
    }

    if (response.status !== ResponseStatus.PENDING) {
      throw new BadRequestException('Response already processed');
    }

    // Обновляем статус отклика
    response.status = ResponseStatus.ACCEPTED;
    response.respondedAt = new Date();
    await this.responsesRepo.save(response);

    // Назначаем исполнителя на заказ
    const order = response.order;
    order.contractor = response.contractor;
    order.status = 'pending_acceptance' as any; // Заказ принят, ожидает начала работы
    const updatedOrder = await this.ordersRepo.save(order) as unknown as Order;

    // Отклоняем все остальные отклики на этот заказ
    await this.responsesRepo.update(
      {
        orderId: order.id,
        status: ResponseStatus.PENDING,
        id: { $ne: responseId } as any,
      },
      {
        status: ResponseStatus.REJECTED,
        respondedAt: new Date(),
      },
    );

    // Уведомление исполнителю о принятии
    await this.notificationsService.notifyOrderAccepted(
      order.id,
      response.contractor.id,
      order.title,
    );

    return updatedOrder;
  }

  // Клиент отклоняет отклик
  async rejectResponse(responseId: string, customerId: string): Promise<OrderResponse> {
    const response = await this.responsesRepo.findOne({
      where: { id: responseId },
      relations: ['order', 'order.customer'],
    });

    if (!response) {
      throw new NotFoundException('Response not found');
    }

    if (response.order.customer.id !== customerId) {
      throw new BadRequestException('Not authorized');
    }

    if (response.status !== ResponseStatus.PENDING) {
      throw new BadRequestException('Response already processed');
    }

    response.status = ResponseStatus.REJECTED;
    response.respondedAt = new Date();

    return this.responsesRepo.save(response) as unknown as OrderResponse;
  }

  // Исполнитель отзывает свой отклик
  async withdrawResponse(responseId: string, contractorId: string): Promise<OrderResponse> {
    const response = await this.responsesRepo.findOne({
      where: { id: responseId, contractorId },
    });

    if (!response) {
      throw new NotFoundException('Response not found');
    }

    if (response.status !== ResponseStatus.PENDING) {
      throw new BadRequestException('Response already processed');
    }

    response.status = ResponseStatus.WITHDRAWN;
    response.respondedAt = new Date();

    return this.responsesRepo.save(response) as unknown as OrderResponse;
  }

  // Получить количество откликов на заказ
  async getResponsesCount(orderId: string): Promise<number> {
    return this.responsesRepo.count({
      where: { orderId, status: ResponseStatus.PENDING },
    });
  }
}

