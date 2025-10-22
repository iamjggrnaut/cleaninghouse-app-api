/**
 * Тестовый скрипт для проверки системы платежей
 * Запуск: node test-payment-system.js
 */

const axios = require('axios');

const API_BASE_URL = 'https://app.cleaninghouse-premium.ru/api';
// const API_BASE_URL = 'http://localhost:3000/api';

// Тестовые данные
const testData = {
  customer: {
    email: 'test-customer@example.com',
    password: 'test123456',
    fullName: 'Тестовый Заказчик',
    phone: '+79000000001'
  },
  contractor: {
    email: 'test-contractor@example.com', 
    password: 'test123456',
    fullName: 'Тестовый Исполнитель',
    phone: '+79000000002'
  }
};

let customerToken = '';
let contractorToken = '';
let personalizedOrderId = '';
let invitationId = '';

async function testPaymentSystem() {
  console.log('🚀 Начинаем тестирование системы платежей...\n');

  try {
    // 1. Регистрация тестового заказчика
    console.log('1️⃣ Регистрируем тестового заказчика...');
    await registerCustomer();
    
    // 2. Регистрация тестового исполнителя
    console.log('2️⃣ Регистрируем тестового исполнителя...');
    await registerContractor();
    
    // 3. Создание персонализированного заказа
    console.log('3️⃣ Создаем персонализированный заказ...');
    await createPersonalizedOrder();
    
    // 4. Создание приглашения
    console.log('4️⃣ Создаем приглашение...');
    await createInvitation();
    
    // 5. Принятие приглашения
    console.log('5️⃣ Принимаем приглашение...');
    await acceptInvitation();
    
    // 6. Проверка статуса платежа
    console.log('6️⃣ Проверяем статус платежа...');
    await checkPaymentStatus();
    
    // 7. Завершение заказа исполнителем
    console.log('7️⃣ Завершаем заказ исполнителем...');
    await completeOrder();
    
    // 8. Подтверждение платежа заказчиком
    console.log('8️⃣ Подтверждаем платеж заказчиком...');
    await confirmPayment();
    
    console.log('✅ Тестирование системы платежей завершено успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.response?.data || error.message);
  }
}

async function registerCustomer() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      fullName: testData.customer.fullName,
      phone: testData.customer.phone,
      email: testData.customer.email,
      password: testData.customer.password,
      role: 'customer'
    });
    
    if (response.data.success) {
      customerToken = response.data.data.accessToken;
      console.log('✅ Заказчик зарегистрирован');
    } else {
      throw new Error('Ошибка регистрации заказчика');
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message.includes('уже существует')) {
      console.log('⚠️ Заказчик уже существует, пытаемся войти...');
      await loginCustomer();
    } else {
      throw error;
    }
  }
}

async function loginCustomer() {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: testData.customer.email,
    password: testData.customer.password
  });
  
  if (response.data.success) {
    customerToken = response.data.data.accessToken;
    console.log('✅ Заказчик авторизован');
  } else {
    throw new Error('Ошибка авторизации заказчика');
  }
}

async function registerContractor() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      fullName: testData.contractor.fullName,
      phone: testData.contractor.phone,
      email: testData.contractor.email,
      password: testData.contractor.password,
      role: 'contractor'
    });
    
    if (response.data.success) {
      contractorToken = response.data.data.accessToken;
      console.log('✅ Исполнитель зарегистрирован');
    } else {
      throw new Error('Ошибка регистрации исполнителя');
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message.includes('уже существует')) {
      console.log('⚠️ Исполнитель уже существует, пытаемся войти...');
      await loginContractor();
    } else {
      throw error;
    }
  }
}

async function loginContractor() {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: testData.contractor.email,
    password: testData.contractor.password
  });
  
  if (response.data.success) {
    contractorToken = response.data.data.accessToken;
    console.log('✅ Исполнитель авторизован');
  } else {
    throw new Error('Ошибка авторизации исполнителя');
  }
}

async function createPersonalizedOrder() {
  const response = await axios.post(`${API_BASE_URL}/personalized-orders`, {
    contractorId: 'test-contractor-id', // В реальном тесте нужно получить ID исполнителя
    title: 'Тестовый заказ на уборку',
    description: 'Нужно убрать квартиру в 2 комнаты',
    budget: 5000,
    fullAddress: 'Москва, ул. Тестовая, д. 1, кв. 1',
    customerPhone: testData.customer.phone,
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    specialInstructions: 'Особые требования к уборке',
    estimatedDuration: 3
  }, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  
  if (response.data.success) {
    personalizedOrderId = response.data.data.id;
    console.log('✅ Персонализированный заказ создан:', personalizedOrderId);
  } else {
    throw new Error('Ошибка создания персонализированного заказа');
  }
}

async function createInvitation() {
  const response = await axios.post(`${API_BASE_URL}/invitations`, {
    contractorId: 'test-contractor-id', // В реальном тесте нужно получить ID исполнителя
    personalizedOrderId: personalizedOrderId,
    message: 'Приглашаю вас выполнить этот заказ'
  }, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  
  if (response.data.success) {
    invitationId = response.data.data.id;
    console.log('✅ Приглашение создано:', invitationId);
  } else {
    throw new Error('Ошибка создания приглашения');
  }
}

async function acceptInvitation() {
  const response = await axios.put(`${API_BASE_URL}/invitations/${invitationId}/accept`, {}, {
    headers: { Authorization: `Bearer ${contractorToken}` }
  });
  
  if (response.data.success) {
    console.log('✅ Приглашение принято');
  } else {
    throw new Error('Ошибка принятия приглашения');
  }
}

async function checkPaymentStatus() {
  const response = await axios.get(`${API_BASE_URL}/payment-holds/customer`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  
  if (response.data.success) {
    console.log('✅ Статус платежей получен:', response.data.data.length, 'записей');
  } else {
    throw new Error('Ошибка получения статуса платежей');
  }
}

async function completeOrder() {
  const response = await axios.put(`${API_BASE_URL}/personalized-orders/${personalizedOrderId}/complete`, {}, {
    headers: { Authorization: `Bearer ${contractorToken}` }
  });
  
  if (response.data.success) {
    console.log('✅ Заказ завершен исполнителем');
  } else {
    throw new Error('Ошибка завершения заказа');
  }
}

async function confirmPayment() {
  const response = await axios.put(`${API_BASE_URL}/personalized-orders/${personalizedOrderId}/confirm`, {}, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  
  if (response.data.success) {
    console.log('✅ Платеж подтвержден заказчиком');
  } else {
    throw new Error('Ошибка подтверждения платежа');
  }
}

// Запуск тестирования
testPaymentSystem();
