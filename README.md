# CleaningHouse Premium Backend

Backend для мобильного приложения CleaningHouse Premium - платформы для поиска клинеров и заказа услуг по уборке.

## Технологии

- **Framework:** NestJS 10
- **Database:** PostgreSQL 15
- **ORM:** TypeORM
- **Auth:** JWT (access/refresh tokens)
- **Payments:** YooKassa (hold/capture + payouts)
- **Language:** TypeScript

## Архитектура

```
server/
├── src/
│   ├── entities/          # TypeORM entities
│   │   ├── user.entity.ts
│   │   └── order.entity.ts
│   ├── modules/
│   │   ├── auth/          # Аутентификация, JWT
│   │   ├── users/         # Управление пользователями
│   │   └── orders/        # Заказы, статусы
│   ├── payments/          # Платежи, выплаты, транзакции
│   │   ├── payment.entity.ts
│   │   ├── payout.entity.ts
│   │   ├── transaction.entity.ts
│   │   ├── payment-method.entity.ts
│   │   ├── payments.service.ts
│   │   └── payments.controller.ts
│   ├── auth/
│   │   ├── jwt.guard.ts   # JWT Guard для защиты endpoints
│   │   └── dto.ts         # DTOs для валидации
│   ├── main.ts            # Entry point
│   ├── app.module.ts      # Root module
│   └── seed.ts            # Seed script для тестовых данных
└── API.md                 # Полная документация API
```

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка PostgreSQL

Создайте базу данных:

```sql
CREATE DATABASE cleaninghouse;
```

### 3. Environment Variables

Создайте файл `.env` в корне `server/`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=React2022
DB_NAME=cleaninghouse

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# YooKassa (для production)
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
```

### 4. Запуск сервера

#### Development (с hot-reload):
```bash
npm run start:dev
```

Сервер запустится на http://localhost:3000

#### Production:
```bash
npm run build
npm run start:prod
```

### 5. Populate Database (тестовые данные)

```bash
npm run seed
```

Создаст:
- 2 тестовых пользователя (customer + contractor)
- 3 тестовых заказа

**Тестовые аккаунты:**
- **Customer:** +79000000001 / TestCustomer123!
- **Contractor:** +79000000002 / TestContractor123!

---

## API Documentation

Полная документация API: [API.md](./API.md)

**Base URL:** `http://localhost:3000/api`

### Основные endpoints:

#### Auth
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токена
- `POST /api/auth/request-code` - Запрос кода верификации (DEV: 123456)
- `POST /api/auth/verify-code` - Подтверждение кода

#### Users
- `GET /api/users/:id` - Профиль пользователя
- `PUT /api/users/:id` - Обновить профиль (🔒 JWT)

#### Orders
- `GET /api/orders` - Список заказов (с фильтрацией)
- `GET /api/orders/:id` - Детали заказа
- `POST /api/orders` - Создать заказ (🔒 JWT)
- `POST /api/orders/:id/complete` - Исполнитель завершил (🔒 JWT)
- `POST /api/orders/:id/confirm` - Клиент подтвердил (🔒 JWT)
- `POST /api/orders/:id/decline` - Отказаться от заказа (🔒 JWT)
- `DELETE /api/orders/:id` - Удалить заказ

#### Payments
- `POST /api/payments` - Создать платеж (hold)
- `GET /api/payments/:id` - Информация о платеже
- `POST /api/payments/:id/capture` - Подтвердить платеж (capture)
- `GET /api/payments/balance` - Баланс исполнителя (🔒 JWT)
- `GET /api/payments/transactions` - История транзакций (🔒 JWT)
- `POST /api/payments/methods` - Сохранить карту (🔒 JWT)
- `GET /api/payments/methods/list` - Список карт (🔒 JWT)

---

## Основные фичи

### 1. Аутентификация
- JWT-токены (access + refresh)
- Регистрация с верификацией по SMS (DEV: фиксированный код 123456)
- Роли: Customer (клиент), Contractor (исполнитель)
- Верификация паспортных данных для исполнителей

### 2. Заказы (Orders)
- **Статусы:** OPEN → ACTIVE → AWAITING_PAYMENT → COMPLETED
- **Двойное подтверждение:**
  1. Исполнитель отмечает работу как выполненную (`contractorCompleted`)
  2. Клиент подтверждает получение услуги (`customerConfirmed`)
  3. После обоих подтверждений → автоматический capture платежа
- **Отказ/Удаление:**
  - Исполнитель может отказаться от заказа
  - Клиент может удалить заказ (только если статус = OPEN)

### 3. Платежи (Payments)
- **Hold/Capture:** Деньги блокируются при создании заказа, списываются после выполнения
- **Автоматические выплаты:** После capture автоматически создается payout исполнителю
- **Комиссия:** 12% с исполнителя
- **Retry Logic:** При ошибке выплаты — автоматические ретраи (1мин, 5мин, 15мин, 1ч, 2ч)
- **Идемпотентность:** Дублирующие запросы на выплату игнорируются

### 4. Транзакции
- История всех операций (платежи, выплаты, комиссии, возвраты)
- Баланс исполнителя с детализацией

---

## Database Schema

### Users
- Роли: `customer` | `contractor`
- Поля: `fullName`, `phone`, `email`, `city`, `passwordHash`
- Рейтинг: `rating`, `reviewsCount`, `ordersCompleted`
- Контрактор: `citizenship`, `passport*`, `verified`

### Orders
- Статус: `OPEN` | `REQUEST` | `PENDING_ACCEPTANCE` | `ACTIVE` | `AWAITING_PAYMENT` | `COMPLETED` | `CANCELLED`
- Связи: `customer` (User), `contractor` (User)
- Подтверждения: `contractorCompleted`, `customerConfirmed`

### Payments
- Hold/Capture флоу
- Связь с заказом и пользователем
- YooKassa integration: `yookassaPaymentId`, `yookassaConfirmationUrl`

### Payouts
- Автоматические выплаты исполнителям
- Retry механизм
- Идемпотентность

### Transactions
- Типы: `payment`, `payout`, `commission`, `refund`
- История всех операций

---

## Development

### TypeORM Migrations

Синхронизация схемы (DEV):
```bash
# Автоматическая синхронизация при запуске (synchronize: true в dev)
```

Production:
```bash
# Рекомендуется использовать migrations
npm run typeorm migration:generate -- src/migrations/InitialSchema
npm run typeorm migration:run
```

### Тестирование

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

### Линтинг

```bash
npm run lint
npm run format
```

---

## Production Checklist

- [ ] Сменить `JWT_SECRET` на криптостойкий
- [ ] Настроить `DB_PASSWORD` (не использовать дефолтный)
- [ ] Настроить YooKassa (реальные `SHOP_ID` и `SECRET_KEY`)
- [ ] Включить SSL для PostgreSQL
- [ ] Настроить CORS (ограничить список доменов)
- [ ] Включить rate limiting
- [ ] Настроить logging (Winston, Sentry)
- [ ] Настроить мониторинг (Prometheus, Grafana)
- [ ] Переключить TypeORM на migrations (`synchronize: false`)
- [ ] Настроить автоматические бэкапы БД
- [ ] Настроить CI/CD pipeline
- [ ] Добавить health check endpoints
- [ ] Настроить webhook для YooKassa (вместо polling)
- [ ] Настроить отправку реальных SMS (Twilio, SMS.ru)

---

## Security

1. **Passwords:** bcrypt (10 rounds)
2. **JWT:** Short-lived access tokens (15 min) + refresh tokens (7 days)
3. **Payment Data:** Sensitive data (passport, cards) должны быть encrypted at rest
4. **API Rate Limiting:** Рекомендуется настроить в production
5. **CORS:** Ограничить список разрешенных origins
6. **SQL Injection:** TypeORM защищает (parameterized queries)
7. **XSS:** Валидация DTO через class-validator

---

## Support

Вопросы и баги: [GitHub Issues](https://github.com/yourorg/cleaninghouse-mobile)

Документация NestJS: https://docs.nestjs.com

---

## License

MIT
