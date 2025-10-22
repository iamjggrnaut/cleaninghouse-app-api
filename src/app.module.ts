import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities (Phase 2 MVP)
import { User } from './entities/user.entity';
import { Order } from './entities/order.entity';
import { Notification } from './entities/notification.entity';
import { OrderResponse } from './entities/order-response.entity';
import { Review } from './entities/review.entity';
import { Promo } from './entities/promo.entity';
import { PaymentMethod } from './payments/payment-method.entity';

// Modules
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { FilesModule } from './files/files.module';
import { EmailModule } from './email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrderResponsesModule } from './order-responses/order-responses.module';
import { PushModule } from './push/push.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PromosModule } from './promos/promos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'React2022',
        database: process.env.DB_NAME || 'cleaninghouse',
        entities: [User, Order, Notification, OrderResponse, Review, Promo, PaymentMethod],
        synchronize: true,
      }),
    }),
    EmailModule,
    PushModule,
    NotificationsModule,
    OrderResponsesModule,
    ReviewsModule,
    PromosModule,
    UsersModule,
    OrdersModule,
    AuthModule,
    PaymentsModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
