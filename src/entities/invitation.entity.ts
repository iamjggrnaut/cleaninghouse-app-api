import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

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
  @Column()
  personalizedOrderId!: string;

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
