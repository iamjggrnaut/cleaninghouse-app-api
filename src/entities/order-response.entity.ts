import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { User } from './user.entity';

export enum ResponseStatus {
  PENDING = 'pending', // Ожидает рассмотрения клиентом
  ACCEPTED = 'accepted', // Принят клиентом
  REJECTED = 'rejected', // Отклонен клиентом
  WITHDRAWN = 'withdrawn', // Отозван исполнителем
}

@Entity('order_responses')
export class OrderResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  order: Order;

  @Column()
  orderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  contractor: User;

  @Column()
  contractorId: string;

  @Column({ type: 'text', nullable: true })
  message: string; // Сообщение от исполнителя (опционально)

  @Column({ type: 'int', nullable: true })
  proposedPrice: number; // Предложенная цена (может отличаться от бюджета)

  @Column({ type: 'int', nullable: true })
  estimatedDuration: number; // Предполагаемая длительность в часах

  @Column({
    type: 'enum',
    enum: ResponseStatus,
    default: ResponseStatus.PENDING,
  })
  status: ResponseStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date; // Когда клиент ответил (принял/отклонил)
}

