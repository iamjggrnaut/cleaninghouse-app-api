import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Promo } from '../entities/promo.entity';
import { PromosService } from './promos.service';
import { PromosController } from './promos.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    TypeOrmModule.forFeature([Promo])
  ],
  providers: [PromosService],
  controllers: [PromosController],
  exports: [PromosService],
})
export class PromosModule {}

