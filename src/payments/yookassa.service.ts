import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface YooKassaPayment {
  id: string;
  status: string;
  amount: {
    value: string;
    currency: string;
  };
  created_at: string;
  expires_at?: string;
  metadata?: any;
}

export interface YooKassaHoldRequest {
  amount: {
    value: string;
    currency: string;
  };
  confirmation: {
    type: string;
    return_url: string;
  };
  capture: boolean;
  description: string;
  metadata?: any;
}

@Injectable()
export class YooKassaService {
  private readonly shopId: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly returnUrl: string;

  constructor(private configService: ConfigService) {
    this.shopId = this.configService.get<string>('YOOKASSA_SHOP_ID') || '1187292';
    this.secretKey = this.configService.get<string>('YOOKASSA_SECRET_KEY') || 'test_KW0GVWw98vJfPNqJXkSY7vmup_j-Let-UXPr6RQZHdk';
    this.baseUrl = this.configService.get<string>('YOOKASSA_BASE_URL') || 'https://api.yookassa.ru/v3';
    this.returnUrl = this.configService.get<string>('YOOKASSA_RETURN_URL') || 'https://app.cleaninghouse-premium.ru/payment/return';
  }

  // Создание холда платежа
  async createHold(data: {
    amount: number;
    description: string;
    metadata?: any;
    expiresAt?: Date;
  }): Promise<YooKassaPayment> {
    try {
      // Преобразуем amount в число если это строка
      const amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount;
      
      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException('Неверная сумма для холда');
      }

      console.log('🔍 YooKassaService.createHold: Создаем холд', {
        originalAmount: data.amount,
        processedAmount: amount,
        type: typeof data.amount
      });

      const holdRequest: YooKassaHoldRequest = {
        amount: {
          value: amount.toFixed(2),
          currency: 'RUB',
        },
        confirmation: {
          type: 'redirect',
          return_url: this.returnUrl,
        },
        capture: false, // Не списываем сразу, только холдим
        description: data.description,
        metadata: {
          ...data.metadata,
          type: 'hold',
          created_at: new Date().toISOString(),
        },
      };

      // Добавляем время истечения холда
      if (data.expiresAt) {
        holdRequest.metadata.expires_at = data.expiresAt.toISOString();
      }

      const response = await axios.post(
        `${this.baseUrl}/payments`,
        holdRequest,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Idempotence-Key': `hold_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Ошибка создания холда в YooKassa:', error.response?.data || error.message);
      throw new BadRequestException(`Ошибка создания холда: ${error.response?.data?.description || error.message}`);
    }
  }

  // Подтверждение холда (списание средств)
  async captureHold(paymentId: string): Promise<YooKassaPayment> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments/${paymentId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Idempotence-Key': `capture_${paymentId}_${Date.now()}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Ошибка подтверждения холда в YooKassa:', error.response?.data || error.message);
      throw new BadRequestException(`Ошибка подтверждения холда: ${error.response?.data?.description || error.message}`);
    }
  }

  // Отмена холда (возврат средств)
  async cancelHold(paymentId: string): Promise<YooKassaPayment> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments/${paymentId}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Idempotence-Key': `cancel_${paymentId}_${Date.now()}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Ошибка отмены холда в YooKassa:', error.response?.data || error.message);
      throw new BadRequestException(`Ошибка отмены холда: ${error.response?.data?.description || error.message}`);
    }
  }

  // Получение информации о платеже
  async getPayment(paymentId: string): Promise<YooKassaPayment> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Ошибка получения платежа из YooKassa:', error.response?.data || error.message);
      throw new BadRequestException(`Ошибка получения платежа: ${error.response?.data?.description || error.message}`);
    }
  }

  // Создание возврата
  async createRefund(data: {
    paymentId: string;
    amount: number;
    description: string;
  }): Promise<any> {
    try {
      const refundRequest = {
        amount: {
          value: data.amount.toFixed(2),
          currency: 'RUB',
        },
        payment_id: data.paymentId,
        description: data.description,
      };

      const response = await axios.post(
        `${this.baseUrl}/refunds`,
        refundRequest,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Idempotence-Key': `refund_${data.paymentId}_${Date.now()}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Ошибка создания возврата в YooKassa:', error.response?.data || error.message);
      throw new BadRequestException(`Ошибка создания возврата: ${error.response?.data?.description || error.message}`);
    }
  }

  // Проверка статуса платежа
  isPaymentSuccessful(payment: YooKassaPayment): boolean {
    return payment.status === 'succeeded';
  }

  // Проверка статуса холда
  isHoldActive(payment: YooKassaPayment): boolean {
    return payment.status === 'waiting_for_capture';
  }

  // Проверка истечения холда
  isHoldExpired(payment: YooKassaPayment): boolean {
    if (!payment.expires_at) return false;
    return new Date(payment.expires_at) < new Date();
  }
}