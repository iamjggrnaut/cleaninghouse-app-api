import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Order } from './order.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  CONTRACTOR = 'contractor',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column()
  fullName!: string;

  @Column({ unique: true })
  phone!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  city?: string;

  // Optional identity fields for contractor verification
  @Column({ nullable: true })
  citizenship?: string;

  @Column({ nullable: true })
  passportSeries?: string;

  @Column({ nullable: true })
  passportNumber?: string;

  @Column({ nullable: true })
  passportIssuedBy?: string;

  @Column({ type: 'date', nullable: true })
  passportIssueDate?: string;

  @Column({ default: false })
  verified!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  verificationDate?: Date;

  @Column({ select: false })
  passwordHash!: string;

  @Column({ type: 'float', default: 0 })
  rating!: number;

  @Column({ type: 'int', default: 0 })
  reviewsCount!: number;

  @Column({ type: 'int', default: 0 })
  ordersCompleted!: number;

  @Column({ default: true })
  pushEnabled!: boolean;

  @Column({ nullable: true })
  pushToken?: string;

  @Column({ default: true })
  emailNotificationsEnabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Order, (o) => o.customer)
  customerOrders!: Order[];

  @OneToMany(() => Order, (o) => o.contractor)
  contractorOrders!: Order[];
}

