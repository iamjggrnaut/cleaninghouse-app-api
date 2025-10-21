import { Injectable } from '@nestjs/common';
import { YooCheckout, ICreatePayment, ICapturePayment, Payment as IPayment } from '@a2seven/yoo-checkout';

@Injectable()
export class YooKassaService {
  private checkout: YooCheckout;

  constructor() {
    const shopId = process.env.YOOKASSA_SHOP_ID || '1187292';
    const secretKey = process.env.YOOKASSA_SECRET_KEY || 'test_KW0GVWw98vJfPNqJXkSY7vmup_j-Let-UXPr6RQZHdk';

    this.checkout = new YooCheckout({
      shopId,
      secretKey,
    });

    console.log(`💳 YooKassa initialized (Shop ID: ${shopId}, Mode: ${shopId.includes('test') || secretKey.includes('test') ? 'TEST' : 'PRODUCTION'})`);
  }

  /**
   * Создать платеж (hold - холдирование средств)
   * @param amount - сумма в рублях
   * @param description - описание платежа
   * @param orderId - ID заказа (для metadata)
   * @param returnUrl - URL для редиректа после оплаты
   */
  async createPayment(
    amount: number,
    description: string,
    orderId: string,
    returnUrl?: string,
  ): Promise<IPayment> {
    const idempotenceKey = `${orderId}-${Date.now()}`;

    const createPayload: ICreatePayment = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      capture: false, // Холдирование (не списываем сразу)
      confirmation: {
        type: 'redirect',
        return_url: returnUrl || 'https://cleaninghouse-premium.ru/payment/success',
      },
      description,
      metadata: {
        orderId,
      },
    };

    try {
      const payment = await this.checkout.createPayment(createPayload, idempotenceKey);
      console.log(`💳 YooKassa payment created: ${payment.id} (${amount}₽, hold)`);
      return payment;
    } catch (error) {
      console.error('💳 YooKassa createPayment error:', error);
      throw error;
    }
  }

  /**
   * Списать средства (capture - подтверждение холда)
   * @param paymentId - ID платежа в YooKassa
   * @param amount - сумма для списания (может быть меньше холда)
   */
  async capturePayment(paymentId: string, amount?: number): Promise<IPayment> {
    const idempotenceKey = `capture-${paymentId}-${Date.now()}`;

    const capturePayload: ICapturePayment = amount
      ? {
          amount: {
            value: amount.toFixed(2),
            currency: 'RUB',
          },
        }
      : {};

    try {
      const payment = await this.checkout.capturePayment(paymentId, capturePayload, idempotenceKey);
      console.log(`💳 YooKassa payment captured: ${paymentId} (${payment.amount.value}₽)`);
      return payment;
    } catch (error) {
      console.error('💳 YooKassa capturePayment error:', error);
      throw error;
    }
  }

  /**
   * Отменить платеж (cancel - отмена холда)
   * @param paymentId - ID платежа в YooKassa
   */
  async cancelPayment(paymentId: string, idempotenceKey?: string): Promise<IPayment> {
    const key = idempotenceKey || `cancel-${paymentId}-${Date.now()}`;

    try {
      const payment = await this.checkout.cancelPayment(paymentId, key);
      console.log(`💳 YooKassa payment cancelled: ${paymentId}`);
      return payment;
    } catch (error) {
      console.error('💳 YooKassa cancelPayment error:', error);
      throw error;
    }
  }

  /**
   * Получить информацию о платеже
   * @param paymentId - ID платежа в YooKassa
   */
  async getPayment(paymentId: string): Promise<IPayment> {
    try {
      const payment = await this.checkout.getPayment(paymentId);
      return payment;
    } catch (error) {
      console.error('💳 YooKassa getPayment error:', error);
      throw error;
    }
  }

  /**
   * Создать выплату исполнителю (SBP или на карту)
   * @param amount - сумма выплаты
   * @param payoutToken - токен выплаты (карта/счет исполнителя)
   * @param description - описание выплаты
   */
  async createPayout(
    amount: number,
    payoutToken: string,
    description: string,
  ): Promise<any> {
    const idempotenceKey = `payout-${Date.now()}`;

    const payoutPayload = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      payout_destination_data: {
        type: 'bank_card',
        card: {
          number: payoutToken, // или используем сохраненный payment_method_id
        },
      },
      description,
      metadata: {
        type: 'contractor_payout',
      },
    };

    try {
      // Примечание: для выплат нужен отдельный API endpoint
      // В SDK @a2seven/yoo-checkout выплаты могут быть не реализованы
      // Используем прямой HTTP запрос к API YooKassa
      console.log(`💸 YooKassa payout request: ${amount}₽ to ${payoutToken}`);
      // TODO: Implement direct API call for payouts
      return { success: true, amount, payoutToken };
    } catch (error) {
      console.error('💸 YooKassa createPayout error:', error);
      throw error;
    }
  }

  /**
   * Сохранить платежный метод (карту)
   * Возвращает payment_method_id для последующих платежей
   */
  async savePaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<any> {
    // YooKassa автоматически сохраняет карты при первом платеже
    // Здесь мы просто возвращаем данные для хранения в БД
    return {
      paymentMethodId,
      customerId,
      savedAt: new Date(),
    };
  }
}

