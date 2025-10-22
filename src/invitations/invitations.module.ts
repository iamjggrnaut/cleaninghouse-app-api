import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { Invitation } from '../entities/invitation.entity';
import { PersonalizedOrder } from '../entities/personalized-order.entity';
import { User } from '../entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentHoldService } from '../payments/payment-hold.service';
import { PaymentHold } from '../entities/payment-hold.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, PersonalizedOrder, User, PaymentHold]),
    NotificationsModule,
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService, PaymentHoldService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
