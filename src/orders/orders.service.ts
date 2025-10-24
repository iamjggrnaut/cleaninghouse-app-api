import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  findAll() {
    return this.ordersRepo.find({ order: { createdAt: 'DESC' } as any });
  }

  findCustomerOrders(customerId: string) {
    return this.ordersRepo.find({ 
      where: { customer: { id: customerId } },
      relations: ['customer', 'contractor'],
      order: { createdAt: 'DESC' } as any 
    });
  }

  findById(id: string) {
    return this.ordersRepo.findOne({ where: { id } });
  }

  async create(data: any): Promise<Order> {
    const customer = await this.usersRepo.findOne({ where: { id: data.customerId } });
    const orderData = {
      ...data,
      customer: customer!,
    };
    const order = this.ordersRepo.create(orderData) as unknown as Order;
    const savedOrder = await this.ordersRepo.save(order) as unknown as Order;
    
    // Уведомление клиенту о создании заказа
    await this.notificationsService.notifyOrderCreated(
      savedOrder.id,
      data.customerId,
      data.title,
    );
    
    return savedOrder;
  }

  async contractorComplete(orderId: string, contractorId: string) {
    const order = await this.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (!order.contractor || order.contractor.id !== contractorId) throw new Error('Not allowed');
    order.contractorCompleted = true;
    const savedOrder = await this.ordersRepo.save(order);
    
    // Увеличиваем счетчик выполненных заказов и обновляем уровень исполнителя
    await this.usersService.incrementOrdersCompleted(contractorId);
    
    // Уведомление клиенту о завершении заказа исполнителем
    await this.notificationsService.notifyOrderCompleted(
      orderId,
      order.customer.id,
      'customer',
    );
    
    return savedOrder;
  }

  async customerConfirm(orderId: string, customerId: string) {
    const order = await this.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.customer.id !== customerId) throw new Error('Not allowed');
    order.customerConfirmed = true;
    const savedOrder = await this.ordersRepo.save(order);
    
    // Уведомление исполнителю о подтверждении клиента
    if (order.contractor) {
      await this.notificationsService.notifyOrderCompleted(
        orderId,
        order.contractor.id,
        'contractor',
      );
    }
    
    return savedOrder;
  }

  async contractorDecline(orderId: string, contractorId: string) {
    const order = await this.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (!order.contractor || order.contractor.id !== contractorId) throw new Error('Not allowed');
    
    const customerId = order.customer.id;
    order.contractor = null as any;
    order.status = 'open' as any;
    const savedOrder = await this.ordersRepo.save(order);
    
    // Уведомление клиенту об отказе исполнителя
    await this.notificationsService.notifyOrderCancelled(
      orderId,
      customerId,
      'Исполнитель отказался от заказа',
    );
    
    return savedOrder;
  }

  async deleteIfNoContractor(orderId: string, customerId: string) {
    const order = await this.findById(orderId);
    if (!order) return;
    if (order.customer.id !== customerId) throw new Error('Not allowed');
    if (order.contractor) throw new Error('Cannot delete with contractor assigned');
    await this.ordersRepo.remove(order);
  }
}


