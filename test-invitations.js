/**
 * Скрипт для создания тестовых приглашений
 * Запуск: node test-invitations.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function createTestInvitations() {
  try {
    console.log('🔍 Создаем тестовые приглашения...');
    
    // Сначала создаем персонализированный заказ
    const personalizedOrderData = {
      contractorId: 'test-contractor-id', // Замените на реальный ID исполнителя
      title: 'Генеральная уборка квартиры',
      description: 'Нужна генеральная уборка 3-комнатной квартиры',
      budget: 5000,
      fullAddress: 'Москва, ул. Тверская, д. 1, кв. 10',
      customerPhone: '+79001234567',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Через неделю
      specialInstructions: 'Осторожно с хрупкими предметами',
      estimatedDuration: 4
    };

    console.log('📋 Данные персонализированного заказа:', personalizedOrderData);
    
    // Создаем персонализированный заказ
    const orderResponse = await axios.post(`${BASE_URL}/personalized-orders`, personalizedOrderData, {
      headers: {
        'Authorization': 'Bearer your-jwt-token-here', // Замените на реальный токен
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Персонализированный заказ создан:', orderResponse.data);
    
    const personalizedOrderId = orderResponse.data.data.id;
    
    // Создаем приглашение
    const invitationData = {
      contractorId: 'test-contractor-id', // Замените на реальный ID исполнителя
      personalizedOrderId: personalizedOrderId,
      message: 'Приглашаю вас на уборку квартиры. Очень жду вашего ответа!'
    };
    
    console.log('📋 Данные приглашения:', invitationData);
    
    const invitationResponse = await axios.post(`${BASE_URL}/invitations`, invitationData, {
      headers: {
        'Authorization': 'Bearer your-jwt-token-here', // Замените на реальный токен
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Приглашение создано:', invitationResponse.data);
    
  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error.response?.data || error.message);
  }
}

// Запускаем создание тестовых данных
createTestInvitations();
