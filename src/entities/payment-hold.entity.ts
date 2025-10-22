import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

export enum PaymentHoldStatus {
  HELD = 'held',                 // Заблокировано
  RELEASED = 'released',         // Разблокировано (списано)
  CANCELLED = 'cancelled',       // Отменено
  EXPIRED = 'expired',           // Истекло
}

@Entity('payment_holds')
export class PaymentHold {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Связанный персонализированный заказ
  @Column()
  personalizedOrderId!: string;

  // Заказчик, с карты которого холдируется сумма
  @ManyToOne(() => User, { eager: true })
  customer!: User;

  // Сумма холда
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  // Статус холда
  @Column({ type: 'enum', enum: PaymentHoldStatus, default: PaymentHoldStatus.HELD })
  status!: PaymentHoldStatus;

  // ID транзакции в платежной системе
  @Column({ nullable: true })
  paymentId?: string;

  // ID холда в платежной системе
  @Column({ nullable: true })
  holdId?: string;

  // Дополнительная информация
  @Column({ nullable: true })
  description?: string;

  // Даты
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;
}
