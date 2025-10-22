import { Injectable } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

@Injectable()
export class PushService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo();
    console.log('📲 Expo Push Notifications service initialized');
  }

  /**
   * Отправить push-уведомление
   * @param pushToken - Expo push token пользователя
   * @param title - Заголовок уведомления
   * @param body - Текст уведомления
   * @param data - Дополнительные данные
   */
  async sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: any,
  ): Promise<boolean> {
    // Проверяем валидность токена
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`📲 Invalid Expo push token: ${pushToken}`);
      return false;
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'default',
    };

    try {
      const ticketChunk = await this.expo.sendPushNotificationsAsync([message]);
      
      const ticket = ticketChunk[0];
      if (ticket.status === 'error') {
        console.error(`📲 Push notification error:`, ticket);
        return false;
      }

      console.log(`📲 Push sent successfully to ${pushToken.substring(0, 20)}...`);
      return true;
    } catch (error) {
      console.error('📲 Failed to send push notification:', error);
      return false;
    }
  }

  /**
   * Отправить push-уведомления нескольким пользователям
   * @param pushTokens - Массив Expo push токенов
   * @param title - Заголовок уведомления
   * @param body - Текст уведомления
   * @param data - Дополнительные данные
   */
  async sendPushNotifications(
    pushTokens: string[],
    title: string,
    body: string,
    data?: any,
  ): Promise<{ success: number; failed: number }> {
    const validTokens = pushTokens.filter((token) => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      console.warn('📲 No valid push tokens provided');
      return { success: 0, failed: pushTokens.length };
    }

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'default',
    }));

    try {
      // Expo может обрабатывать до 100 сообщений за раз
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('📲 Error sending chunk:', error);
        }
      }

      const success = tickets.filter((ticket) => ticket.status === 'ok').length;
      const failed = tickets.filter((ticket) => ticket.status === 'error').length;

      console.log(`📲 Push notifications sent: ${success} success, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('📲 Failed to send push notifications:', error);
      return { success: 0, failed: validTokens.length };
    }
  }

  /**
   * Валидация Expo push token
   */
  isValidPushToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  /**
   * Отправить push-уведомление о приглашении
   */
  async sendInvitationNotification(
    pushToken: string,
    customerName: string,
    orderTitle: string,
    data?: any,
  ): Promise<boolean> {
    return this.sendPushNotification(
      pushToken,
      'Новое приглашение',
      `${customerName} пригласил вас для выполнения заказа: ${orderTitle}`,
      { type: 'invitation', ...data }
    );
  }

  /**
   * Отправить push-уведомление о принятии приглашения
   */
  async sendInvitationAcceptedNotification(
    pushToken: string,
    contractorName: string,
    orderTitle: string,
    data?: any,
  ): Promise<boolean> {
    return this.sendPushNotification(
      pushToken,
      'Приглашение принято',
      `${contractorName} принял ваше приглашение для заказа: ${orderTitle}`,
      { type: 'invitation_accepted', ...data }
    );
  }

  /**
   * Отправить push-уведомление об отклонении приглашения
   */
  async sendInvitationRejectedNotification(
    pushToken: string,
    contractorName: string,
    orderTitle: string,
    reason: string,
    data?: any,
  ): Promise<boolean> {
    return this.sendPushNotification(
      pushToken,
      'Приглашение отклонено',
      `${contractorName} отклонил ваше приглашение. Причина: ${reason}`,
      { type: 'invitation_rejected', reason, ...data }
    );
  }

  /**
   * Отправить push-уведомление о завершении персонализированного заказа
   */
  async sendPersonalizedOrderCompletedNotification(
    pushToken: string,
    contractorName: string,
    orderTitle: string,
    data?: any,
  ): Promise<boolean> {
    return this.sendPushNotification(
      pushToken,
      'Заказ завершен',
      `${contractorName} завершил ваш заказ: ${orderTitle}. Подтвердите качество работы.`,
      { type: 'personalized_order_completed', ...data }
    );
  }

  /**
   * Отправить push-уведомление о холде платежа
   */
  async sendPaymentHoldNotification(
    pushToken: string,
    amount: number,
    orderTitle: string,
    data?: any,
  ): Promise<boolean> {
    return this.sendPushNotification(
      pushToken,
      'Платеж заблокирован',
      `С вашей карты заблокирована сумма ${amount} руб. для заказа: ${orderTitle}`,
      { type: 'payment_hold', amount, ...data }
    );
  }

  /**
   * Отправить push-уведомление о списании платежа
   */
  async sendPaymentReleasedNotification(
    pushToken: string,
    amount: number,
    orderTitle: string,
    data?: any,
  ): Promise<boolean> {
    return this.sendPushNotification(
      pushToken,
      'Платеж списан',
      `С вашей карты списана сумма ${amount} руб. за заказ: ${orderTitle}`,
      { type: 'payment_released', amount, ...data }
    );
  }

  /**
   * Отправить push-уведомление о получении оплаты
   */
  async sendPaymentReceivedNotification(
    pushToken: string,
    amount: number,
    orderTitle: string,
    data?: any,
  ): Promise<boolean> {
    return this.sendPushNotification(
      pushToken,
      'Оплата получена',
      `Вы получили оплату ${amount} руб. за заказ: ${orderTitle}`,
      { type: 'payment_received', amount, ...data }
    );
  }
}

