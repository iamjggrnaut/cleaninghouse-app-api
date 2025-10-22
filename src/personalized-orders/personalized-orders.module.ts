import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalizedOrdersController } from './personalized-orders.controller';
import { PersonalizedOrdersService } from './personalized-orders.service';
import { PersonalizedOrder } from '../entities/personalized-order.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([PersonalizedOrder, User]),
    NotificationsModule,
    PaymentsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PersonalizedOrdersController],
  providers: [PersonalizedOrdersService],
  exports: [PersonalizedOrdersService],
})
export class PersonalizedOrdersModule {}
