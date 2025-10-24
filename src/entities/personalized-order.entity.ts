import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

export enum PersonalizedOrderStatus {
  PENDING = 'pending',           // Ожидает ответа исполнителя
  ACTIVE = 'active',             // Принято, в работе
  COMPLETED = 'completed',       // Завершено исполнителем
  CONFIRMED = 'confirmed',       // Подтверждено заказчиком
  CANCELLED = 'cancelled',       // Отменено
}

@Entity('personalized_orders')
export class PersonalizedOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Заказчик
  @ManyToOne(() => User, { eager: true })
  customer!: User;

  // Приглашенный исполнитель
  @ManyToOne(() => User, { eager: true })
  contractor!: User;

  // Основная информация о заказе
  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  // Бюджет заказа
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  budget!: number;

  // Адрес (полный для заказчика, скрытый для исполнителя до принятия)
  @Column()
  fullAddress!: string;

  @Column()
  maskedAddress!: string; // Адрес со скрытыми деталями

  // Контактная информация (скрытая до принятия)
  @Column()
  customerPhone!: string;

  @Column()
  maskedPhone!: string; // Телефон со скрытыми цифрами

  // Время выполнения
  @Column({ type: 'timestamptz' })
  scheduledDate!: Date;

  // Статус заказа
  @Column({ type: 'enum', enum: PersonalizedOrderStatus, default: PersonalizedOrderStatus.PENDING })
  status!: PersonalizedOrderStatus;

  // Финансовая информация
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.15 })
  platformCommission!: number; // Комиссия платформы (%)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  contractorFee!: number; // Сумма исполнителю

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  platformFee!: number; // Сумма платформе

  // Дополнительные поля
  @Column({ nullable: true })
  specialInstructions?: string;

  @Column({ nullable: true })
  estimatedDuration?: number; // Ожидаемая продолжительность в часах

  // Даты
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
