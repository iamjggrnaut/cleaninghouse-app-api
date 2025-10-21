import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

export enum OrderStatus {
  OPEN = 'open',
  REQUEST = 'request',
  PENDING_ACCEPTANCE = 'pending',
  ACTIVE = 'active',
  AWAITING_PAYMENT = 'awaiting_payment',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.OPEN })
  status!: OrderStatus;

  @ManyToOne(() => User, (u) => u.customerOrders, { eager: true })
  customer!: User;

  @ManyToOne(() => User, (u) => u.contractorOrders, { eager: true, nullable: true })
  contractor?: User | null;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column('text', { array: true, default: '{}' })
  services!: string[];

  @Column('text', { array: true, default: '{}' })
  photos!: string[];

  @Column()
  city!: string;

  @Column()
  address!: string;

  @Column({ type: 'date' })
  scheduledDate!: string;

  @Column()
  scheduledTime!: string;

  @Column({ type: 'int' })
  estimatedDuration!: number;

  @Column({ type: 'int' })
  budget!: number;

  @Column({ type: 'int', default: 0 })
  advancePaid!: number;

  @Column({ type: 'int', default: 0 })
  totalPaid!: number;

  @Column({ type: 'int', default: 0 })
  responsesCount!: number;

  @Column({ default: false })
  contractorCompleted!: boolean;

  @Column({ default: false })
  customerConfirmed!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

