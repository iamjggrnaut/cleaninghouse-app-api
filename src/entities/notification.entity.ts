import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  ORDER_CREATED = 'order_created',
  ORDER_RESPONSE = 'order_response',
  ORDER_ACCEPTED = 'order_accepted',
  ORDER_COMPLETED = 'order_completed',
  ORDER_CANCELLED = 'order_cancelled',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  REVIEW_RECEIVED = 'review_received',
  PROMO = 'promo',
  SYSTEM = 'system',
  // Новые типы для приглашений
  INVITATION_RECEIVED = 'invitation_received',
  INVITATION_ACCEPTED = 'invitation_accepted',
  INVITATION_REJECTED = 'invitation_rejected',
  INVITATION_CANCELLED = 'invitation_cancelled',
  PERSONALIZED_ORDER_READY = 'personalized_order_ready',
  PERSONALIZED_ORDER_COMPLETED = 'personalized_order_completed',
  PAYMENT_HOLD_CREATED = 'payment_hold_created',
  PAYMENT_HOLD_RELEASED = 'payment_hold_released',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>; // Дополнительные данные (orderId, paymentId, etc.)

  @Column({ default: false })
  read: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}

