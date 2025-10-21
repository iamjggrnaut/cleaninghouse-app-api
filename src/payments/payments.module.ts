import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Payment } from './payment.entity';
import { Payout } from './payout.entity';
import { PaymentMethod } from './payment-method.entity';
import { Transaction } from './transaction.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { YooKassaService } from './yookassa.service';
import { Order } from '../entities/order.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    TypeOrmModule.forFeature([Payment, Payout, PaymentMethod, Transaction, Order, User])
  ],
  providers: [PaymentsService, YooKassaService],
  controllers: [PaymentsController],
  exports: [PaymentsService, YooKassaService],
})
export class PaymentsModule {}


