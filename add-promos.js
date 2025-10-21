const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

const testPromos = [
  {
    title: 'Первая уборка со скидкой 20%',
    description: 'Специальное предложение для новых клиентов',
    fullDescription: 'Получите скидку 20% на первую уборку в нашем сервисе. Это отличная возможность познакомиться с качеством наших услуг по выгодной цене. Акция действует только для новых пользователей.',
    discount: '-20%',
    imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
    validUntil: '2024-12-31',
    terms: [
      'Скидка действует только для новых пользователей',
      'Минимальная стоимость заказа 2000 рублей',
      'Акция не суммируется с другими предложениями',
      'Скидка применяется автоматически при первом заказе',
    ],
    isActive: true,
  },
  {
    title: 'Еженедельная уборка - скидка 15%',
    description: 'Экономия при регулярном обслуживании',
    fullDescription: 'Заказывайте еженедельную уборку и получайте скидку 15% на каждый визит. Идеально для офисов, квартир и других помещений, требующих регулярного ухода.',
    discount: '-15%',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
    validUntil: '2025-01-15',
    terms: [
      'Скидка действует при заказе еженедельной уборки',
      'Минимальный период подписки - 1 месяц',
      'Возможность отмены за 24 часа до визита',
      'Персональный клинер для каждого заказа',
    ],
    isActive: true,
  },
  {
    title: 'Генеральная уборка - скидка 25%',
    description: 'Особые условия для капитальной уборки',
    fullDescription: 'Заказывайте генеральную уборку и получайте максимальную скидку 25%. Включает в себя глубокую очистку всех поверхностей, мытье окон, уборку труднодоступных мест.',
    discount: '-25%',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    validUntil: '2025-02-28',
    terms: [
      'Скидка действует только на генеральную уборку',
      'Минимальная площадь 50 кв.м',
      'Время выполнения 4-6 часов',
      'Использование профессионального оборудования',
    ],
    isActive: true,
  },
];

async function addPromos() {
  try {
    console.log('🌱 Добавляем тестовые акции...');
    
    for (const promo of testPromos) {
      try {
        const response = await axios.post(`${API_BASE}/promos`, promo);
        console.log(`✅ Добавлена акция: ${promo.title}`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('⚠️ Требуется авторизация для создания акций');
          break;
        }
        console.error(`❌ Ошибка при добавлении акции ${promo.title}:`, error.message);
      }
    }
    
    // Проверим, что акции загружаются
    try {
      const response = await axios.get(`${API_BASE}/promos`);
      console.log(`📊 Всего акций в базе: ${response.data.data.length}`);
    } catch (error) {
      console.error('❌ Ошибка при загрузке акций:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message);
  }
}

// Ждем 3 секунды, чтобы сервер успел запуститься
setTimeout(addPromos, 3000);

