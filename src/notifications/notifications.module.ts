import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushModule } from '../push/push.module';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    TypeOrmModule.forFeature([Notification, User]),
    PushModule
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}

