import { DataSource } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Order, OrderStatus } from './entities/order.entity';
import * as bcrypt from 'bcryptjs';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'React2022',
    database: process.env.DB_NAME || 'cleaninghouse',
    entities: [User, Order],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  const userRepo = dataSource.getRepository(User);
  const orderRepo = dataSource.getRepository(Order);

  // Очистка таблиц (учитываем FK)
  await orderRepo.clear();
  await userRepo.query('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
  console.log('🗑️  Tables cleared');

  // Создание тестовых пользователей
  const customer = userRepo.create({
    role: UserRole.CUSTOMER,
    fullName: 'Иван Иванов',
    phone: '+79000000001',
    email: 'ivan@example.com',
    city: 'Москва',
    passwordHash: await bcrypt.hash('TestCustomer123!', 10),
    rating: 4.8,
    reviewsCount: 15,
    ordersCompleted: 12,
  });

  const contractor = userRepo.create({
    role: UserRole.CONTRACTOR,
    fullName: 'Мария Куценко',
    phone: '+79000000002',
    email: 'maria@example.com',
    city: 'Москва',
    passwordHash: await bcrypt.hash('TestContractor123!', 10),
    rating: 4.9,
    reviewsCount: 45,
    ordersCompleted: 114,
  });

  await userRepo.save([customer, contractor]);
  console.log('👤 Users created');

  // Создание тестовых заказов
  const orders = [
    orderRepo.create({
      status: OrderStatus.OPEN,
      customer,
      title: 'Поддерживающая уборка',
      description: 'Требуется поддерживающая уборка 2-комнатной квартиры. Влажная уборка, пылесос, мытье полов.',
      services: ['cleaning'],
      photos: ['https://images.unsplash.com/photo-1505692794403-34d4982b7f81?w=1200'],
      city: 'Москва',
      address: 'ул. Тверская, д. 10',
      scheduledDate: '2024-10-16',
      scheduledTime: '14:00',
      estimatedDuration: 3,
      budget: 4800,
    }),
    orderRepo.create({
      status: OrderStatus.ACTIVE,
      customer,
      contractor,
      title: 'Генеральная уборка',
      description: 'Генеральная уборка после ремонта. Нужно вымыть окна, полы, убрать строительную пыль.',
      services: ['deep_cleaning', 'windows'],
      photos: [],
      city: 'Москва',
      address: 'пр. Мира, д. 50',
      scheduledDate: '2024-10-14',
      scheduledTime: '10:00',
      estimatedDuration: 5,
      budget: 8900,
      advancePaid: 2670,
      totalPaid: 2670,
    }),
    orderRepo.create({
      status: OrderStatus.OPEN,
      customer,
      title: 'Мытье окон',
      description: 'Необходимо помыть окна в 3-комнатной квартире (6 окон).',
      services: ['windows'],
      photos: [],
      city: 'Москва',
      address: 'ул. Ленина, д. 25',
      scheduledDate: '2024-10-18',
      scheduledTime: '12:00',
      estimatedDuration: 2,
      budget: 3500,
    }),
  ];

  await orderRepo.save(orders);
  console.log('📦 Orders created');

  await dataSource.destroy();
  console.log('✅ Seed completed successfully!');
  console.log('\n📱 Test accounts:');
  console.log('Customer: +79000000001 / TestCustomer123!');
  console.log('Contractor: +79000000002 / TestContractor123!');
}

seed().catch(console.error);

