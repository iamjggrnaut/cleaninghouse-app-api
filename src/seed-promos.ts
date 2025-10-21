import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PromosService } from './promos/promos.service';

async function seedPromos() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const promosService = app.get(PromosService);

  const testPromos = [
    {
      title: 'Первая уборка со скидкой 20%',
      description: 'Специальное предложение для новых клиентов',
      fullDescription: 'Получите скидку 20% на первую уборку в нашем сервисе. Это отличная возможность познакомиться с качеством наших услуг по выгодной цене. Акция действует только для новых пользователей.',
      discount: '-20%',
      imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
      validUntil: new Date('2024-12-31'),
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
      validUntil: new Date('2025-01-15'),
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
      validUntil: new Date('2025-02-28'),
      terms: [
        'Скидка действует только на генеральную уборку',
        'Минимальная площадь 50 кв.м',
        'Время выполнения 4-6 часов',
        'Использование профессионального оборудования',
      ],
      isActive: true,
    },
  ];

  try {
    console.log('🌱 Начинаем добавление тестовых акций...');
    
    for (const promoData of testPromos) {
      const existingPromo = await promosService.getPromoById(promoData.title);
      if (!existingPromo) {
        await promosService.createPromo(promoData);
        console.log(`✅ Добавлена акция: ${promoData.title}`);
      } else {
        console.log(`⚠️ Акция уже существует: ${promoData.title}`);
      }
    }
    
    console.log('🎉 Тестовые акции успешно добавлены!');
  } catch (error) {
    console.error('❌ Ошибка при добавлении акций:', error);
  } finally {
    await app.close();
  }
}

seedPromos();

