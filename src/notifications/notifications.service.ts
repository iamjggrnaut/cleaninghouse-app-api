import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { PushService } from '../push/push.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly pushService: PushService,
    private readonly emailService: EmailService,
  ) {}

  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<Notification> {
    const notification = this.notificationsRepo.create(data);
    const saved = await this.notificationsRepo.save(notification);

    // Отправляем push-уведомление
    await this.sendPushNotification(data.userId, data.title, data.message, data.data);

    return saved;
  }

  private async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      
      if (!user || !user.pushEnabled || !user.pushToken) {
        return; // Пользователь не настроил push или отключил их
      }

      await this.pushService.sendPushNotification(
        user.pushToken,
        title,
        message,
        data,
      );
    } catch (error) {
      console.error('Failed to send push notification:', error);
      // Не бросаем ошибку, чтобы не сломать основной флоу
    }
  }

  async findAllByUser(userId: string, read?: boolean): Promise<Notification[]> {
    const query: any = { userId };
    if (read !== undefined) {
      query.read = read;
    }
    return this.notificationsRepo.find({
      where: query,
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepo.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new Error('Notification not found');
    }
    notification.read = true;
    return this.notificationsRepo.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepo.update(
      { userId, read: false },
      { read: true },
    );
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await this.notificationsRepo.delete({ id, userId });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepo.count({
      where: { userId, read: false },
    });
  }

  // Trigger methods - вызываются из других сервисов

  async notifyOrderCreated(orderId: string, customerId: string, title: string) {
    // Уведомление для клиента о создании заказа
    await this.createNotification({
      userId: customerId,
      type: NotificationType.ORDER_CREATED,
      title: 'Заказ создан',
      message: `Ваш заказ "${title}" успешно создан. Ожидайте откликов от исполнителей.`,
      data: { orderId },
    });
  }

  async notifyOrderResponse(
    orderId: string,
    customerId: string,
    contractorName: string,
  ) {
    // Уведомление для клиента об отклике на заказ
    await this.createNotification({
      userId: customerId,
      type: NotificationType.ORDER_RESPONSE,
      title: 'Новый отклик',
      message: `${contractorName} откликнулся на ваш заказ.`,
      data: { orderId },
    });
  }

  async notifyOrderAccepted(
    orderId: string,
    contractorId: string,
    orderTitle: string,
  ) {
    // Уведомление для исполнителя о принятии заказа
    await this.createNotification({
      userId: contractorId,
      type: NotificationType.ORDER_ACCEPTED,
      title: 'Заказ принят',
      message: `Ваш отклик на заказ "${orderTitle}" был принят клиентом.`,
      data: { orderId },
    });
  }

  async notifyOrderCompleted(
    orderId: string,
    userId: string,
    role: 'customer' | 'contractor',
  ) {
    const message =
      role === 'customer'
        ? 'Заказ выполнен. Пожалуйста, подтвердите и оплатите.'
        : 'Вы отметили заказ как выполненный. Ожидайте подтверждения от клиента.';

    await this.createNotification({
      userId,
      type: NotificationType.ORDER_COMPLETED,
      title: 'Заказ выполнен',
      message,
      data: { orderId },
    });
  }

  async notifyOrderCancelled(
    orderId: string,
    userId: string,
    reason: string,
  ) {
    await this.createNotification({
      userId,
      type: NotificationType.ORDER_CANCELLED,
      title: 'Заказ отменен',
      message: reason || 'Заказ был отменен.',
      data: { orderId },
    });
  }

  async notifyPaymentSuccess(
    orderId: string,
    customerId: string,
    contractorId: string,
    amount: number,
  ) {
    // Уведомление для клиента
    await this.createNotification({
      userId: customerId,
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'Оплата прошла успешно',
      message: `Платеж на сумму ${amount}₽ успешно проведен.`,
      data: { orderId, amount },
    });

    // Уведомление для исполнителя
    await this.createNotification({
      userId: contractorId,
      type: NotificationType.PAYMENT_SUCCESS,
      title: 'Заказ оплачен',
      message: `Клиент оплатил заказ. Средства поступят на ваш баланс.`,
      data: { orderId, amount },
    });
  }


  async notifyPromo(userId: string, title: string, message: string) {
    await this.createNotification({
      userId,
      type: NotificationType.PROMO,
      title,
      message,
      data: {},
    });
  }

  async notifySystem(userId: string, title: string, message: string) {
    await this.createNotification({
      userId,
      type: NotificationType.SYSTEM,
      title,
      message,
      data: {},
    });
  }

  async notifyReviewReceived(
    userId: string,
    reviewerName: string,
    rating: number,
  ) {
    // Уведомление о новом отзыве
    await this.createNotification({
      userId,
      type: NotificationType.REVIEW_RECEIVED,
      title: 'Новый отзыв',
      message: `${reviewerName} оставил отзыв с оценкой ${rating} звезд${rating > 1 && rating < 5 ? 'ы' : ''}`,
      data: {},
    });
  }

  // Уведомления о платежах
  async notifyPaymentHoldCreated(userId: string, amount: number, orderTitle: string) {
    const notification = await this.createNotification({
      userId,
      type: NotificationType.PAYMENT_HOLD_CREATED,
      title: 'Платеж заблокирован',
      message: `С вашей карты заблокирована сумма ${amount} руб. для заказа "${orderTitle}"`,
      data: { amount, orderTitle },
    });

    // Отправляем специальное push-уведомление
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (user && user.pushEnabled && user.pushToken) {
      await this.pushService.sendPaymentHoldNotification(
        user.pushToken,
        amount,
        orderTitle,
        { notificationId: notification.id }
      );
    }

    return notification;
  }

  async notifyPaymentHoldReleased(userId: string, amount: number, orderTitle: string) {
    const notification = await this.createNotification({
      userId,
      type: NotificationType.PAYMENT_HOLD_RELEASED,
      title: 'Платеж списан',
      message: `С вашей карты списана сумма ${amount} руб. за заказ "${orderTitle}"`,
      data: { amount, orderTitle },
    });

    // Отправляем специальное push-уведомление
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (user && user.pushEnabled && user.pushToken) {
      await this.pushService.sendPaymentReleasedNotification(
        user.pushToken,
        amount,
        orderTitle,
        { notificationId: notification.id }
      );
    }

    return notification;
  }

  async notifyPaymentReceived(userId: string, amount: number, orderTitle: string) {
    const notification = await this.createNotification({
      userId,
      type: NotificationType.PAYMENT_RECEIVED,
      title: 'Оплата получена',
      message: `Вы получили оплату ${amount} руб. за заказ "${orderTitle}"`,
      data: { amount, orderTitle },
    });

    // Отправляем специальное push-уведомление
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (user && user.pushEnabled && user.pushToken) {
      await this.pushService.sendPaymentReceivedNotification(
        user.pushToken,
        amount,
        orderTitle,
        { notificationId: notification.id }
      );
    }

    return notification;
  }

  async notifyPaymentFailed(userId: string, amount: number, orderTitle: string, reason: string) {
    return this.createNotification({
      userId,
      type: NotificationType.PAYMENT_FAILED,
      title: 'Ошибка платежа',
      message: `Не удалось списать ${amount} руб. за заказ "${orderTitle}". Причина: ${reason}`,
      data: { amount, orderTitle, reason },
    });
  }

  // Уведомления о приглашениях
  async notifyInvitationReceived(
    userId: string, 
    customerName: string, 
    orderTitle: string, 
    orderDescription?: string, 
    budget?: number
  ) {
    const notification = await this.createNotification({
      userId,
      type: NotificationType.INVITATION_RECEIVED,
      title: 'Новое приглашение',
      message: `${customerName} пригласил вас для выполнения заказа: ${orderTitle}`,
      data: { customerName, orderTitle },
    });

    // Отправляем push-уведомление
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (user && user.pushEnabled && user.pushToken) {
      await this.pushService.sendInvitationNotification(
        user.pushToken,
        customerName,
        orderTitle,
        { notificationId: notification.id }
      );
    }

    // Отправляем email-уведомление
    if (user && user.emailNotificationsEnabled && user.email) {
      await this.emailService.sendInvitationEmail(
        user.email,
        customerName,
        orderTitle,
        orderDescription || 'Описание не указано',
        budget || 0
      );
    }

    return notification;
  }

  async notifyInvitationAccepted(userId: string, contractorName: string, orderTitle: string) {
    const notification = await this.createNotification({
      userId,
      type: NotificationType.INVITATION_ACCEPTED,
      title: 'Приглашение принято',
      message: `${contractorName} принял ваше приглашение для заказа: ${orderTitle}`,
      data: { contractorName, orderTitle },
    });

    // Отправляем push-уведомление
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (user && user.pushEnabled && user.pushToken) {
      await this.pushService.sendInvitationAcceptedNotification(
        user.pushToken,
        contractorName,
        orderTitle,
        { notificationId: notification.id }
      );
    }

    // Отправляем email-уведомление
    if (user && user.emailNotificationsEnabled && user.email) {
      await this.emailService.sendInvitationAcceptedEmail(
        user.email,
        contractorName,
        orderTitle
      );
    }

    return notification;
  }

  async notifyInvitationRejected(userId: string, contractorName: string, orderTitle: string, reason: string) {
    const notification = await this.createNotification({
      userId,
      type: NotificationType.INVITATION_REJECTED,
      title: 'Приглашение отклонено',
      message: `${contractorName} отклонил ваше приглашение. Причина: ${reason}`,
      data: { contractorName, orderTitle, reason },
    });

    // Отправляем push-уведомление
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (user && user.pushEnabled && user.pushToken) {
      await this.pushService.sendInvitationRejectedNotification(
        user.pushToken,
        contractorName,
        orderTitle,
        reason,
        { notificationId: notification.id }
      );
    }

    // Отправляем email-уведомление
    if (user && user.emailNotificationsEnabled && user.email) {
      await this.emailService.sendInvitationRejectedEmail(
        user.email,
        contractorName,
        orderTitle,
        reason
      );
    }

    return notification;
  }

  async notifyPersonalizedOrderCompleted(userId: string, contractorName: string, orderTitle: string) {
    const notification = await this.createNotification({
      userId,
      type: NotificationType.PERSONALIZED_ORDER_COMPLETED,
      title: 'Заказ завершен',
      message: `${contractorName} завершил ваш заказ: ${orderTitle}. Подтвердите качество работы.`,
      data: { contractorName, orderTitle },
    });

    // Отправляем специальное push-уведомление
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (user && user.pushEnabled && user.pushToken) {
      await this.pushService.sendPersonalizedOrderCompletedNotification(
        user.pushToken,
        contractorName,
        orderTitle,
        { notificationId: notification.id }
      );
    }

    return notification;
  }
}

