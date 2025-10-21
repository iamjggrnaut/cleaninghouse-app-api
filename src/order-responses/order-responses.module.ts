import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { OrderResponse } from '../entities/order-response.entity';
import { Order } from '../entities/order.entity';
import { User } from '../entities/user.entity';
import { OrderResponsesService } from './order-responses.service';
import { OrderResponsesController } from './order-responses.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    TypeOrmModule.forFeature([OrderResponse, Order, User])
  ],
  providers: [OrderResponsesService],
  controllers: [OrderResponsesController],
  exports: [OrderResponsesService],
})
export class OrderResponsesModule {}

