import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalizedOrdersController } from './personalized-orders.controller';
import { PersonalizedOrdersService } from './personalized-orders.service';
import { PersonalizedOrder } from '../entities/personalized-order.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentHoldService } from '../payments/payment-hold.service';
import { PaymentHold } from '../entities/payment-hold.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PersonalizedOrder, User, PaymentHold]),
    NotificationsModule,
  ],
  controllers: [PersonalizedOrdersController],
  providers: [PersonalizedOrdersService, PaymentHoldService],
  exports: [PersonalizedOrdersService],
})
export class PersonalizedOrdersModule {}
