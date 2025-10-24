import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation, InvitationStatus } from '../entities/invitation.entity';
import { PersonalizedOrder, PersonalizedOrderStatus } from '../entities/personalized-order.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentHoldService } from '../payments/payment-hold.service';
import { NotificationType } from '../entities/notification.entity';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationsRepo: Repository<Invitation>,
    @InjectRepository(PersonalizedOrder)
    private readonly personalizedOrdersRepo: Repository<PersonalizedOrder>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly paymentHoldService: PaymentHoldService,
  ) {}

  // Создание приглашения
  async createInvitation(data: {
    customerId: string;
    contractorId: string;
    personalizedOrderId: string;
    message?: string;
  }) {
    // Проверяем, что заказчик и исполнитель существуют
    const customer = await this.usersRepo.findOne({ where: { id: data.customerId } });
    const contractor = await this.usersRepo.findOne({ where: { id: data.contractorId } });
    
    if (!customer) throw new NotFoundException('Customer not found');
    if (!contractor) throw new NotFoundException('Contractor not found');
    if (contractor.role !== 'contractor') throw new BadRequestException('User is not a contractor');

    // Проверяем, что персонализированный заказ существует
    const personalizedOrder = await this.personalizedOrdersRepo.findOne({ 
      where: { id: data.personalizedOrderId } 
    });
    if (!personalizedOrder) throw new NotFoundException('Personalized order not found');

    // Проверяем, что нет активного приглашения для этого заказа
    const existingInvitation = await this.invitationsRepo.findOne({
      where: { 
        personalizedOrderId: data.personalizedOrderId,
        status: InvitationStatus.PENDING 
      }
    });
    if (existingInvitation) {
      throw new BadRequestException('Invitation already exists for this order');
    }

    // Создаем приглашение
    const invitation = this.invitationsRepo.create({
      customer,
      contractor,
      personalizedOrderId: data.personalizedOrderId,
      message: data.message,
      status: InvitationStatus.PENDING,
    });

    const savedInvitation = await this.invitationsRepo.save(invitation);

    // Отправляем уведомление исполнителю
    await this.notificationsService.createNotification({
      userId: contractor.id,
      type: NotificationType.INVITATION_RECEIVED,
      title: 'Новое приглашение',
      message: `Заказчик ${customer.fullName} пригласил вас для выполнения заказа`,
      data: {
        invitationId: savedInvitation.id,
        personalizedOrderId: data.personalizedOrderId,
        customerName: customer.fullName,
      },
    });

    return savedInvitation;
  }

  // Получение приглашений для исполнителя
  async getContractorInvitations(contractorId: string) {
    return this.invitationsRepo.find({
      where: { contractor: { id: contractorId } },
      relations: ['customer', 'contractor', 'personalizedOrder'],
      order: { createdAt: 'DESC' },
    });
  }

  // Получение приглашений для заказчика
  async getCustomerInvitations(customerId: string) {
    return this.invitationsRepo.find({
      where: { customer: { id: customerId } },
      relations: ['customer', 'contractor', 'personalizedOrder'],
      order: { createdAt: 'DESC' },
    });
  }

  // Принятие приглашения
  async acceptInvitation(invitationId: string, contractorId: string) {
    const invitation = await this.invitationsRepo.findOne({
      where: { id: invitationId },
      relations: ['customer', 'contractor', 'personalizedOrder'],
    });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.contractor.id !== contractorId) {
      throw new BadRequestException('Not authorized to accept this invitation');
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is not pending');
    }

    // Обновляем статус приглашения
    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationsRepo.save(invitation);

    // Обновляем статус персонализированного заказа
    const personalizedOrder = await this.personalizedOrdersRepo.findOne({
      where: { id: invitation.personalizedOrderId }
    });
    if (personalizedOrder) {
      personalizedOrder.status = PersonalizedOrderStatus.ACTIVE;
      await this.personalizedOrdersRepo.save(personalizedOrder);
    }

    // Создаем холд платежа (только если есть персонализированный заказ)
    if (invitation.personalizedOrderId && personalizedOrder) {
      console.log('🔍 InvitationsService.acceptInvitation: Создаем холд платежа', {
        personalizedOrderId: invitation.personalizedOrderId,
        customerId: invitation.customer.id,
        originalBudget: personalizedOrder.budget,
        budgetType: typeof personalizedOrder.budget,
        convertedAmount: Number(personalizedOrder.budget)
      });
      
      await this.paymentHoldService.createHold({
        personalizedOrderId: invitation.personalizedOrderId,
        customerId: invitation.customer.id,
        amount: Number(personalizedOrder.budget),
      });
    }

    // Отправляем уведомление заказчику
    await this.notificationsService.createNotification({
      userId: invitation.customer.id,
      type: NotificationType.INVITATION_ACCEPTED,
      title: 'Приглашение принято',
      message: `Исполнитель ${invitation.contractor.fullName} принял ваше приглашение`,
      data: {
        invitationId: invitation.id,
        contractorName: invitation.contractor.fullName,
      },
    });

    return invitation;
  }

  // Отклонение приглашения
  async rejectInvitation(invitationId: string, contractorId: string, rejectionReason: string) {
    const invitation = await this.invitationsRepo.findOne({
      where: { id: invitationId },
      relations: ['customer', 'contractor'],
    });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.contractor.id !== contractorId) {
      throw new BadRequestException('Not authorized to reject this invitation');
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is not pending');
    }

    // Обновляем статус приглашения
    invitation.status = InvitationStatus.REJECTED;
    invitation.rejectionReason = rejectionReason;
    await this.invitationsRepo.save(invitation);

    // Отправляем уведомление заказчику
    await this.notificationsService.createNotification({
      userId: invitation.customer.id,
      type: NotificationType.INVITATION_REJECTED,
      title: 'Приглашение отклонено',
      message: `Исполнитель ${invitation.contractor.fullName} отклонил ваше приглашение. Причина: ${rejectionReason}`,
      data: {
        invitationId: invitation.id,
        contractorName: invitation.contractor.fullName,
        rejectionReason,
      },
    });

    return invitation;
  }

  // Отмена приглашения заказчиком
  async cancelInvitation(invitationId: string, customerId: string) {
    const invitation = await this.invitationsRepo.findOne({
      where: { id: invitationId },
      relations: ['customer', 'contractor'],
    });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.customer.id !== customerId) {
      throw new BadRequestException('Not authorized to cancel this invitation');
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is not pending');
    }

    // Обновляем статус приглашения
    invitation.status = InvitationStatus.CANCELLED;
    await this.invitationsRepo.save(invitation);

    // Отправляем уведомление исполнителю
    await this.notificationsService.createNotification({
      userId: invitation.contractor.id,
      type: NotificationType.INVITATION_CANCELLED,
      title: 'Приглашение отменено',
      message: `Заказчик ${invitation.customer.fullName} отменил приглашение`,
      data: {
        invitationId: invitation.id,
        customerName: invitation.customer.fullName,
      },
    });

    return invitation;
  }

  // Отказ от приглашения исполнителем (отмена холда)
  async declineInvitation(invitationId: string, contractorId: string): Promise<Invitation> {
    const invitation = await this.invitationsRepo.findOne({
      where: { id: invitationId },
      relations: ['customer', 'contractor', 'personalizedOrder'],
    });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.contractor.id !== contractorId) {
      throw new BadRequestException('Not authorized to decline this invitation');
    }
    if (invitation.status !== InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Invitation is not accepted');
    }

    // Отменяем холд платежа
    if (invitation.personalizedOrderId) {
      await this.paymentHoldService.cancelHold(invitation.personalizedOrderId);
    }

    // Обновляем статусы
    invitation.status = InvitationStatus.CANCELLED;
    if (invitation.personalizedOrder) {
      invitation.personalizedOrder.status = PersonalizedOrderStatus.CANCELLED;
      await this.personalizedOrdersRepo.save(invitation.personalizedOrder);
    }
    await this.invitationsRepo.save(invitation);

    // Отправляем уведомление заказчику
    await this.notificationsService.createNotification({
      userId: invitation.customer.id,
      type: NotificationType.INVITATION_CANCELLED,
      title: 'Исполнитель отказался от заказа',
      message: `Исполнитель ${invitation.contractor.fullName} отказался от выполнения заказа. Деньги возвращены на ваш счет.`,
      data: {
        invitationId: invitation.id,
        contractorName: invitation.contractor.fullName,
        orderTitle: invitation.personalizedOrder?.title,
      },
    });

    return invitation;
  }

  // Завершение заказа исполнителем
  async completeInvitation(invitationId: string, contractorId: string): Promise<Invitation> {
    const invitation = await this.invitationsRepo.findOne({
      where: { id: invitationId },
      relations: ['customer', 'contractor', 'personalizedOrder'],
    });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.contractor.id !== contractorId) {
      throw new BadRequestException('Not authorized to complete this invitation');
    }
    if (invitation.status !== InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Invitation is not accepted');
    }

    // Обновляем статусы
    invitation.status = InvitationStatus.COMPLETED;
    if (invitation.personalizedOrder) {
      invitation.personalizedOrder.status = PersonalizedOrderStatus.COMPLETED;
      await this.personalizedOrdersRepo.save(invitation.personalizedOrder);
    }
    await this.invitationsRepo.save(invitation);

    // Отправляем уведомление заказчику
    await this.notificationsService.createNotification({
      userId: invitation.customer.id,
      type: NotificationType.PERSONALIZED_ORDER_COMPLETED,
      title: 'Заказ завершен',
      message: `Исполнитель ${invitation.contractor.fullName} завершил ваш заказ. Подтвердите выполнение для списания средств.`,
      data: {
        invitationId: invitation.id,
        contractorName: invitation.contractor.fullName,
        orderTitle: invitation.personalizedOrder?.title,
      },
    });

    return invitation;
  }

  // Подтверждение заказа заказчиком (списание средств)
  async confirmInvitation(invitationId: string, customerId: string): Promise<Invitation> {
    const invitation = await this.invitationsRepo.findOne({
      where: { id: invitationId },
      relations: ['customer', 'contractor', 'personalizedOrder'],
    });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.customer.id !== customerId) {
      throw new BadRequestException('Not authorized to confirm this invitation');
    }
    if (invitation.status !== InvitationStatus.COMPLETED) {
      throw new BadRequestException('Invitation is not completed');
    }

    // Списываем средства с холда
    if (invitation.personalizedOrderId) {
      await this.paymentHoldService.releaseHold(invitation.personalizedOrderId);
    }

    // Обновляем статусы
    invitation.status = InvitationStatus.CONFIRMED;
    if (invitation.personalizedOrder) {
      invitation.personalizedOrder.status = PersonalizedOrderStatus.CONFIRMED;
      await this.personalizedOrdersRepo.save(invitation.personalizedOrder);
    }
    await this.invitationsRepo.save(invitation);

    // Отправляем уведомление исполнителю
    await this.notificationsService.createNotification({
      userId: invitation.contractor.id,
      type: NotificationType.PAYMENT_HOLD_RELEASED,
      title: 'Оплата получена',
      message: `Заказчик подтвердил завершение заказа. Оплата поступила на ваш счет.`,
      data: {
        invitationId: invitation.id,
        customerName: invitation.customer.fullName,
        orderTitle: invitation.personalizedOrder?.title,
      },
    });

    return invitation;
  }
}
