import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { PersonalizedOrder } from './personalized-order.entity';

export enum InvitationStatus {
  PENDING = 'pending',           // Ожидает ответа
  ACCEPTED = 'accepted',          // Принято
  REJECTED = 'rejected',          // Отклонено
  COMPLETED = 'completed',        // Завершено
  CANCELLED = 'cancelled',        // Отменено
}

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Заказчик, который отправляет приглашение
  @ManyToOne(() => User, { eager: true })
  customer!: User;

  // Исполнитель, которому отправляется приглашение
  @ManyToOne(() => User, { eager: true })
  contractor!: User;

  // ID персонализированного заказа
  @Column({ nullable: true })
  personalizedOrderId?: string;

  // Связь с персонализированным заказом
  @ManyToOne(() => PersonalizedOrder, { eager: true, nullable: true })
  @JoinColumn({ name: 'personalizedOrderId' })
  personalizedOrder?: PersonalizedOrder;

  // Статус приглашения
  @Column({ type: 'enum', enum: InvitationStatus, default: InvitationStatus.PENDING })
  status!: InvitationStatus;

  // Причина отклонения (если отклонено)
  @Column({ nullable: true })
  rejectionReason?: string;

  // Сообщение от заказчика (опционально)
  @Column({ nullable: true })
  message?: string;

  // Дата создания
  @CreateDateColumn()
  createdAt!: Date;

  // Дата обновления
  @UpdateDateColumn()
  updatedAt!: Date;
}
