# Testing Guide

## Быстрый старт

### 1. Запуск Backend

```bash
cd server
npm install
npm run seed     # Создать тестовые данные
npm run start:dev
```

Server: http://localhost:3000
API: http://localhost:3000/api
Static: http://localhost:3000/static/

### 2. Запуск Mobile

```bash
cd cleaninghouse-premium-expo
npm install
npx expo start
```

### 3. Тестовые аккаунты

**Customer (Клиент):**
- Phone: `+79000000001`
- Password: `TestCustomer123!`

**Contractor (Исполнитель):**
- Phone: `+79000000002`
- Password: `TestContractor123!`

---

## Тестирование функций

### 1. File Upload (Загрузка файлов)

**Backend:**
```bash
# Проверить что static директории существуют
ls static/avatars static/orders static/reviews static/promos static/portfolio uploads

# Проверить endpoint (с авторизацией)
curl -X POST http://localhost:3000/api/files/upload?category=avatars \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

**Mobile:**
1. Войти в приложение (Login)
2. Перейти в Profile
3. Нажать на аватар
4. Выбрать фото из галереи
5. Проверить что аватар обновился
6. Проверить в БД: `users.avatar` содержит путь `/static/avatars/...webp`
7. Проверить файл: `server/static/avatars/` содержит `.webp` и `-thumb.webp`

**Expected:**
- ✅ Аватар загружается
- ✅ Показывается индикатор загрузки
- ✅ Alert "Успешно" после загрузки
- ✅ Файл конвертируется в WebP
- ✅ Создается thumbnail (200x200)
- ✅ БД обновляется с новым путем

---

### 2. Image Processing

**Test different categories:**

```bash
# Avatars - должен создать 400x400 + thumbnail 200x200
POST /api/files/upload?category=avatars

# Orders - resize до 1200x900
POST /api/files/upload?category=orders

# Reviews - resize до 1200x900
POST /api/files/upload?category=reviews

# Promos - resize до 800x600
POST /api/files/upload?category=promos

# Portfolio - resize до 1200x1200
POST /api/files/upload?category=portfolio
```

**Проверить:**
1. Оригинал удален из `uploads/`
2. WebP создан в `static/{category}/`
3. Размер соответствует категории
4. Качество приемлемое (визуально)

---

### 3. File Delete

**Backend:**
```bash
curl -X DELETE http://localhost:3000/api/files/avatars/filename.webp \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
- ✅ Файл удален из `static/avatars/`
- ✅ Thumbnail тоже удален (для avatars)
- ✅ 404 если файл не существует

---

### 4. Static Serve

**Browser:**
- Open: http://localhost:3000/static/avatars/your-file.webp
- Should display the image

**Mobile:**
```typescript
// URL должен автоматически преобразовываться
fileService.getImageUrl('/static/avatars/file.webp')
// → 'http://localhost:3000/static/avatars/file.webp'
```

---

## Integration Tests

### Полный флоу: Регистрация → Profile → Avatar Upload

1. **Регистрация (Contractor):**
   - Открыть приложение
   - "Зарегистрироваться" → "Исполнитель"
   - Заполнить форму (Step 1-3)
   - Пропустить паспортные данные
   - Ввести код `123456`
   - ✅ Зарегистрирован

2. **Login:**
   - Войти с новыми данными
   - ✅ Перенаправлен на Home

3. **Profile:**
   - Перейти в "Профиль"
   - ✅ Видно placeholder аватар
   - Нажать на аватар
   - Выбрать фото
   - ✅ Индикатор загрузки
   - ✅ Alert "Успешно"
   - ✅ Новый аватар отображается

4. **Verify (Backend):**
```sql
SELECT id, fullName, avatar FROM users WHERE phone = '+7...';
-- avatar должен быть '/static/avatars/...webp'
```

5. **Verify (Files):**
```bash
cd server/static/avatars
ls -lh
# Должны быть: xxx.webp и xxx-thumb.webp
```

---

## Common Issues

### 1. "No file uploaded"
- Проверить что FormData содержит поле `file`
- Проверить Content-Type (должен быть multipart/form-data)

### 2. "Only image files allowed"
- Загружаются только: jpg, jpeg, png, webp
- Max size: 5MB

### 3. "Authentication required"
- Проверить что JWT token передается
- Token должен быть валидным

### 4. Изображение не отображается
- Проверить URL: должен быть полный путь
- Проверить что файл существует в `static/`
- Проверить CORS настройки

### 5. Sharp ошибки
- Убедиться что sharp установлен: `npm install sharp`
- Попробовать переустановить: `npm rebuild sharp`

---

## Performance Tests

### Image Upload Speed

```bash
# Small image (~100KB)
time curl -X POST http://localhost:3000/api/files/upload?category=avatars \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@small.jpg"

# Large image (~3MB)
time curl -X POST http://localhost:3000/api/files/upload?category=orders \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@large.jpg"
```

**Expected:**
- Small: < 1 second
- Large: < 3 seconds

### Concurrent Uploads

```bash
# Test 5 concurrent uploads
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/files/upload?category=orders \
    -H "Authorization: Bearer TOKEN" \
    -F "file=@test$i.jpg" &
done
wait
```

**Expected:**
- ✅ All complete successfully
- ✅ No file name collisions
- ✅ All files processed

---

## Next Steps

После успешного тестирования File Upload:
1. ✅ Реализовать CreateOrderScreen (с загрузкой фото заказа)
2. ✅ Добавить загрузку фото в Reviews
3. ✅ Portfolio для исполнителей
4. ⏳ Notifications module
5. ⏳ Push notifications

---

## Cleanup

Для очистки тестовых файлов:

```bash
# Удалить все загруженные файлы
cd server
rm -rf static/avatars/* static/orders/* static/reviews/* static/promos/* static/portfolio/* uploads/*

# Оставить .gitignore
# (или через PowerShell)
Remove-Item -Path static\avatars\* -Exclude .gitignore -Force
```

