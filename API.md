# CleaningHouse Premium API Documentation

## Overview

REST API для мобильного приложения CleaningHouse Premium. Реализовано на NestJS с PostgreSQL и TypeORM.

**Base URL:** `http://localhost:3000/api`

---

## Authentication

Используется JWT-токены для аутентификации:
- **Access Token** - для доступа к защищенным эндпоинтам (срок действия: 15 минут)
- **Refresh Token** - для обновления Access Token (срок действия: 7 дней)

### Headers
```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### POST /auth/register
Регистрация нового пользователя.

**Request Body:**
```json
{
  "role": "customer" | "contractor",
  "fullName": "Иван Иванов",
  "phone": "+79001234567",
  "email": "ivan@example.com",
  "password": "Password123!",
  "city": "Москва",
  
  // Только для contractor:
  "citizenship": "РФ",
  "passportSeries": "1234",
  "passportNumber": "567890",
  "passportIssuedBy": "УФМС...",
  "passportIssueDate": "2020-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... }
  }
}
```

### POST /auth/login
Вход в систему.

**Request Body:**
```json
{
  "phone": "+79001234567",
  "password": "Password123!"
}
```

### POST /auth/refresh
Обновление Access Token.

**Request Body:**
```json
{
  "refreshToken": "..."
}
```

### POST /auth/request-code
Запрос кода верификации для регистрации (DEV: код = 123456).

**Request Body:**
```json
{
  "email": "user@example.com",
  "type": "registration" // или "reset"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sent": true,
    "devCode": "123456"  // Только в DEV
  }
}
```

**Email отправляется автоматически** в production.

### POST /auth/verify-code
Подтверждение кода верификации.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "type": "registration" // или "reset"
}
```

### POST /auth/request-reset-code
Запрос кода для сброса пароля (отправляется на email).

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /auth/reset-password
Сброс пароля (после верификации кода).

**Request Body:**
```json
{
  "email": "user@example.com",
  "newPassword": "NewPassword123!"
}
```

---

## User Endpoints

### GET /users/:id
Получить профиль пользователя по ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "role": "customer",
    "fullName": "Иван Иванов",
    "phone": "+79001234567",
    "email": "ivan@example.com",
    "city": "Москва",
    "rating": 4.8,
    "reviewsCount": 15,
    "ordersCompleted": 12,
    "pushEnabled": true,
    "emailNotificationsEnabled": true
  }
}
```

### PUT /users/:id
Обновить профиль пользователя (🔒 требует JWT).

**Request Body:**
```json
{
  "fullName": "Новое Имя",
  "email": "new@example.com",
  "city": "Санкт-Петербург",
  
  // Для contractor:
  "citizenship": "РФ",
  "passportSeries": "...",
  "passportNumber": "...",
  "passportIssuedBy": "...",
  "passportIssueDate": "..."
}
```

---

## File Upload Endpoints

### POST /files/upload
Загрузить изображение (🔒 требует JWT).

**Query Parameters:**
- `category` - категория файла: `avatars`, `orders`, `reviews`, `promos`, `portfolio`

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- Allowed types: jpg, jpeg, png, webp
- Max size: 5MB

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "/static/avatars/1234567890-hash.webp",
    "filename": "1234567890-hash.webp",
    "category": "avatars"
  }
}
```

**Image Processing:**
- Автоматическая конвертация в WebP
- Сжатие с оптимальным качеством
- Resize по категориям:
  - `avatars`: 400x400 + thumbnail 200x200
  - `orders`/`reviews`: до 1200x900
  - `promos`: до 800x600
  - `portfolio`: до 1200x1200

### DELETE /files/:category/:filename
Удалить файл (🔒 требует JWT).

**Parameters:**
- `category` - категория
- `filename` - имя файла

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## Order Endpoints

### GET /orders
Получить список заказов (с фильтрацией).

**Query Parameters:**
- `status` - фильтр по статусу
- `customerId` - заказы конкретного клиента
- `contractorId` - заказы конкретного исполнителя
- `city` - фильтр по городу

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "open",
      "title": "Поддерживающая уборка",
      "description": "...",
      "city": "Москва",
      "address": "ул. Тверская, д. 10",
      "scheduledDate": "2024-10-16",
      "scheduledTime": "14:00",
      "budget": 4800,
      "customer": { ... },
      "contractor": { ... },
      "contractorCompleted": false,
      "customerConfirmed": false
    }
  ]
}
```

### GET /orders/:id
Получить детали заказа.

### POST /orders
Создать новый заказ (🔒 требует JWT).

**Request Body:**
```json
{
  "customerId": "uuid",
  "contractorId": "uuid",  // Опционально (для прямого запроса)
  "title": "Генеральная уборка",
  "description": "...",
  "services": ["cleaning", "windows"],
  "photos": ["https://..."],
  "city": "Москва",
  "address": "...",
  "scheduledDate": "2024-10-20",
  "scheduledTime": "10:00",
  "estimatedDuration": 4,
  "budget": 6000
}
```

### POST /orders/:id/complete
Исполнитель отмечает заказ как выполненный (🔒 требует JWT).

**Request Body:**
```json
{
  "contractorId": "uuid"
}
```

### POST /orders/:id/confirm
Клиент подтверждает выполнение заказа (🔒 требует JWT).

**Request Body:**
```json
{
  "customerId": "uuid"
}
```

### POST /orders/:id/decline
Исполнитель отказывается от заказа (🔒 требует JWT).

**Request Body:**
```json
{
  "contractorId": "uuid"
}
```

### DELETE /orders/:id
Клиент удаляет заказ (только если статус = OPEN).

**Request Body:**
```json
{
  "customerId": "uuid"
}
```

---

## Payment Endpoints

### POST /payments
Создать платеж (hold).

**Request Body:**
```json
{
  "orderId": "uuid",
  "userId": "uuid",
  "amount": 6000  // В копейках
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "amount": 6000,
    "commission": 720,  // 12%
    "total": 6720,
    "status": "pending",
    "yookassaPaymentId": "mock_...",
    "yookassaConfirmationUrl": "https://..."
  }
}
```

### GET /payments/:id
Получить информацию о платеже.

### POST /payments/:id/capture
Подтвердить платеж (capture после hold).

**Response:**
- Автоматически создает выплату исполнителю (payout)
- Обновляет статус заказа на COMPLETED

### POST /payments/methods
Сохранить метод оплаты (🔒 требует JWT).

**Request Body:**
```json
{
  "yookassaPaymentMethodId": "pm_...",
  "cardLast4": "4242",
  "cardType": "Visa"
}
```

### GET /payments/methods/list
Получить список сохраненных методов оплаты (🔒 требует JWT).

### POST /payments/methods/:id/default
Установить метод оплаты по умолчанию (🔒 требует JWT).

### DELETE /payments/methods/:id
Удалить метод оплаты (🔒 требует JWT).

### GET /payments/balance
Получить баланс исполнителя (🔒 требует JWT).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEarned": 50000,
    "availableBalance": 50000,
    "currency": "RUB"
  }
}
```

### GET /payments/transactions
Получить историю транзакций (🔒 требует JWT).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "payout",
      "amount": 5280,
      "description": "Выплата за заказ...",
      "createdAt": "2024-10-15T12:00:00Z"
    }
  ]
}
```

---

## Order Statuses

- `OPEN` - Открыт для откликов
- `REQUEST` - Прямой запрос клинеру
- `PENDING_ACCEPTANCE` - Ожидает принятия клинером
- `ACTIVE` - В работе
- `AWAITING_PAYMENT` - Ожидает оплаты (исполнитель завершил, клиент еще не подтвердил)
- `COMPLETED` - Завершен и оплачен
- `CANCELLED` - Отменен

## Payment Flow

1. **Hold** - Создание платежа (`POST /payments`)
   - Клиент вводит карту (или использует сохраненную)
   - Средства блокируются (hold)
   - Если требуется 3DS → redirect на `yookassaConfirmationUrl`

2. **Capture** - Подтверждение платежа (`POST /payments/:id/capture`)
   - Вызывается после того, как:
     - Исполнитель завершил работу (`contractorCompleted = true`)
     - Клиент подтвердил выполнение (`customerConfirmed = true`)
   - Средства списываются с карты
   - Автоматически создается payout исполнителю
   - Статус заказа → COMPLETED

3. **Payout** - Выплата исполнителю (автоматически)
   - Сумма = `amount - commission` (12%)
   - Метод: YooKassa Payouts / СБП
   - Ретраи при ошибках: 1мин, 5мин, 15мин, 1ч, 2ч
   - Идемпотентность через `idempotencyKey`

---

## Error Handling

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials"
  }
}
```

**Common Error Codes:**
- `400` - Bad Request (валидация)
- `401` - Unauthorized (неверный токен)
- `403` - Forbidden (нет прав)
- `404` - Not Found
- `500` - Internal Server Error

---

## Testing

### Test Accounts

**Customer:**
- Phone: `+79000000001`
- Password: `TestCustomer123!`

**Contractor:**
- Phone: `+79000000002`
- Password: `TestContractor123!`

### Seed Data

Запустить seed-скрипт для создания тестовых пользователей и заказов:

```bash
npm run seed
```

### Development Code Verification

В development режиме для регистрации используется фиксированный код: `123456`

---

## Database Schema

### Users
- `id` (UUID, PK)
- `role` (enum: customer, contractor)
- `fullName`, `phone`, `email`, `city`
- `passwordHash`
- `rating`, `reviewsCount`, `ordersCompleted`
- `pushEnabled`, `emailNotificationsEnabled`
- Contractor fields: `citizenship`, `passport*`, `verified`

### Orders
- `id` (UUID, PK)
- `status` (enum)
- `customer` (FK → users)
- `contractor` (FK → users, nullable)
- `title`, `description`, `services[]`, `photos[]`
- `city`, `address`, `coordinates`
- `scheduledDate`, `scheduledTime`, `estimatedDuration`
- `budget`, `advancePaid`, `totalPaid`
- `contractorCompleted`, `customerConfirmed` (boolean)

### Payments
- `id` (UUID, PK)
- `order` (FK → orders)
- `user` (FK → users)
- `amount`, `commission`, `total`
- `status` (enum: pending, processing, succeeded, failed, cancelled)
- `yookassaPaymentId`, `yookassaConfirmationUrl`

### Payouts
- `id` (UUID, PK)
- `payment` (FK → payments)
- `contractor` (FK → users)
- `amount`, `status`
- `yookassaPayoutId`, `sbpRecipientId`
- `errorMessage`, `retryCount`, `nextRetryAt`
- `idempotencyKey`

### Transactions
- `id` (UUID, PK)
- `user` (FK → users)
- `order` (FK → orders, nullable)
- `type` (enum: payment, payout, commission, refund)
- `amount`, `description`

### PaymentMethods
- `id` (UUID, PK)
- `user` (FK → users)
- `yookassaPaymentMethodId`, `cardLast4`, `cardType`
- `isDefault` (boolean)

---

## Environment Variables

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

# YooKassa (Production)
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
```

---

## Running the Server

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

### Seed Database
```bash
npm run seed
```

---

## Security Notes

1. **Passwords** - хешируются с bcrypt (10 rounds)
2. **JWT** - подписаны секретным ключом, короткий срок жизни
3. **Payment Data** - passport/card info encrypted at rest (в продакшене)
4. **API Rate Limiting** - рекомендуется настроить в production
5. **CORS** - настроен для development, ограничить в production

---

## Support

Для вопросов и багов: [GitHub Issues](https://github.com/yourorg/cleaninghouse-mobile)

