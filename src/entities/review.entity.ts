import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Order } from './order.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  order: Order;

  @Column()
  orderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reviewer: User; // Кто оставил отзыв

  @Column()
  reviewerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reviewee: User; // О ком отзыв

  @Column()
  revieweeId: string;

  @Column({ type: 'int' })
  rating: number; // 1-5 звезд

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  photos?: string[]; // Фотографии к отзыву

  @CreateDateColumn()
  createdAt: Date;
}

