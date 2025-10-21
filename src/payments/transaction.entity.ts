import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';

export enum TransactionType {
  PAYMENT = 'payment', // Платеж от клиента
  PAYOUT = 'payout', // Выплата клинеру
  COMMISSION = 'commission', // Комиссия платформы
  REFUND = 'refund', // Возврат
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true })
  user!: User; // Кому принадлежит транзакция

  @ManyToOne(() => Order, { eager: true, nullable: true })
  order?: Order;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column('int')
  amount!: number; // В копейках

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt!: Date;
}

