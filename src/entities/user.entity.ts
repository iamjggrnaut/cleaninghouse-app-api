import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Order } from './order.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  CONTRACTOR = 'contractor',
}

export enum ContractorLevel {
  SPECIALIST = 'specialist',
  PROFESSIONAL = 'professional', 
  EXPERT = 'expert',
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

  // Детальные адресные поля
  @Column({ nullable: true })
  district?: string; // Район: "ЦАО", "САО", "СВАО"

  @Column({ nullable: true })
  metro?: string; // Ближайшее метро: "Пушкинская", "Тверская"

  @Column({ nullable: true })
  street?: string; // Улица: "Тверская улица"

  @Column({ nullable: true })
  house?: string; // Дом: "1"

  @Column({ nullable: true })
  apartment?: string; // Квартира: "10"

  @Column({ nullable: true })
  postalCode?: string; // Почтовый индекс: "125009"

  // Зона обслуживания (только для исполнителей)
  @Column({ type: 'simple-array', nullable: true })
  serviceAreas?: string[]; // Районы обслуживания: ["ЦАО", "САО"]

  @Column({ type: 'int', nullable: true })
  serviceRadius?: number; // Радиус обслуживания в км

  // Статус для исполнителей (самозанятый/ИП)
  @Column({ nullable: true })
  status?: 'self_employed' | 'individual_entrepreneur';

  // Уровень исполнителя (специалист/профессионал/эксперт)
  @Column({ type: 'enum', enum: ContractorLevel, default: ContractorLevel.SPECIALIST, nullable: true })
  contractorLevel?: ContractorLevel;

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

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Order, (o) => o.customer)
  customerOrders!: Order[];

  @OneToMany(() => Order, (o) => o.contractor)
  contractorOrders!: Order[];
}

