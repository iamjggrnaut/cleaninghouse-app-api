import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalizedOrdersController } from './personalized-orders.controller';
import { PersonalizedOrdersService } from './personalized-orders.service';
import { PersonalizedOrder } from '../entities/personalized-order.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PersonalizedOrder, User]),
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [PersonalizedOrdersController],
  providers: [PersonalizedOrdersService],
  exports: [PersonalizedOrdersService],
})
export class PersonalizedOrdersModule {}
