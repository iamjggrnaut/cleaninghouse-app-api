/**
 * Скрипт для исправления приглашений - создание персонализированных заказов
 * Запуск: node fix-invitations.js
 */

const { Client } = require('pg');

async function fixInvitations() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'React2022',
    database: process.env.DB_NAME || 'cleaninghouse',
  });

  try {
    await client.connect();
    console.log('🔗 Подключились к базе данных');

    // Находим приглашения без персонализированных заказов
    const invitationsResult = await client.query(`
      SELECT i.*, c."fullName" as customer_name, cont."fullName" as contractor_name 
      FROM invitations i
      LEFT JOIN users c ON i."customerId" = c.id
      LEFT JOIN users cont ON i."contractorId" = cont.id
      WHERE i."personalizedOrderId" IS NULL
    `);

    console.log(`📊 Найдено приглашений без персонализированных заказов: ${invitationsResult.rows.length}`);

    for (const invitation of invitationsResult.rows) {
      console.log(`\n🔧 Обрабатываем приглашение: ${invitation.id}`);
      console.log(`👤 Клиент: ${invitation.customer_name}`);
      console.log(`👤 Исполнитель: ${invitation.contractor_name}`);

      // Создаем персонализированный заказ для этого приглашения
      const personalizedOrderId = 'po-' + invitation.id;
      const budget = 5000 + Math.floor(Math.random() * 5000); // Случайный бюджет 5000-10000

      console.log(`📋 Создаем персонализированный заказ с ID: ${personalizedOrderId}, бюджет: ${budget}`);

      await client.query(`
        INSERT INTO personalized_orders (
          id, "customerId", "contractorId", title, description, budget, 
          "fullAddress", "customerPhone", "scheduledDate", "specialInstructions", 
          "estimatedDuration", status, "commissionRate", "contractorPayout", 
          "platformFee", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        personalizedOrderId,
        invitation.customerId,
        invitation.contractorId,
        'Уборка квартиры',
        invitation.message || 'Нужна уборка квартиры',
        budget,
        'Москва, ул. Примерная, д. 1',
        '+79001234567',
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Через неделю
        'Осторожно с хрупкими предметами',
        4,
        'pending',
        0.15,
        Math.floor(budget * 0.85),
        Math.floor(budget * 0.15),
        new Date(),
        new Date()
      ]);

      // Обновляем приглашение с ID персонализированного заказа
      await client.query(`
        UPDATE invitations 
        SET "personalizedOrderId" = $1, "updatedAt" = $2
        WHERE id = $3
      `, [personalizedOrderId, new Date(), invitation.id]);

      console.log(`✅ Приглашение обновлено с персонализированным заказом`);
    }

    // Проверяем результат
    const checkResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT("personalizedOrderId") as with_orders
      FROM invitations
    `);
    
    console.log(`\n📊 Результат:`);
    console.log(`   Всего приглашений: ${checkResult.rows[0].total}`);
    console.log(`   С персонализированными заказами: ${checkResult.rows[0].with_orders}`);

  } catch (error) {
    console.error('❌ Ошибка исправления приглашений:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Соединение закрыто');
  }
}

// Запускаем исправление
fixInvitations();
