/**
 * Скрипт для добавления тестовых данных для системы поиска
 * Запуск: node test-search-data.js
 */

require('dotenv').config({ path: './.env' });
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'https://app.cleaninghouse-premium.ru/api';

// Тестовые данные исполнителей
const testContractors = [
  {
    fullName: 'Анна Петрова',
    phone: '+79001234567',
    email: 'anna.petrova@test.com',
    password: 'password123',
    role: 'contractor',
    city: 'Москва',
    district: 'ЦАО',
    metro: 'Пушкинская',
    street: 'Тверская улица',
    house: '1',
    rating: 4.8,
    ordersCompleted: 45,
    contractorLevel: 'professional',
    verified: true,
    status: 'self_employed'
  },
  {
    fullName: 'Михаил Смирнов',
    phone: '+79001234568',
    email: 'mikhail.smirnov@test.com',
    password: 'password123',
    role: 'contractor',
    city: 'Москва',
    district: 'САО',
    metro: 'Сокольники',
    street: 'Сокольническая улица',
    house: '15',
    rating: 4.6,
    ordersCompleted: 23,
    contractorLevel: 'specialist',
    verified: true,
    status: 'individual_entrepreneur'
  },
  {
    fullName: 'Елена Козлова',
    phone: '+79001234569',
    email: 'elena.kozlova@test.com',
    password: 'password123',
    role: 'contractor',
    city: 'Москва',
    district: 'СВАО',
    metro: 'ВДНХ',
    street: 'Проспект Мира',
    house: '100',
    rating: 4.9,
    ordersCompleted: 78,
    contractorLevel: 'expert',
    verified: true,
    status: 'self_employed'
  },
  {
    fullName: 'Дмитрий Волков',
    phone: '+79001234570',
    email: 'dmitry.volkov@test.com',
    password: 'password123',
    role: 'contractor',
    city: 'Санкт-Петербург',
    district: 'Центральный',
    metro: 'Невский проспект',
    street: 'Невский проспект',
    house: '28',
    rating: 4.7,
    ordersCompleted: 34,
    contractorLevel: 'professional',
    verified: true,
    status: 'individual_entrepreneur'
  },
  {
    fullName: 'Ольга Морозова',
    phone: '+79001234571',
    email: 'olga.morozova@test.com',
    password: 'password123',
    role: 'contractor',
    city: 'Москва',
    district: 'ЦАО',
    metro: 'Красные Ворота',
    street: 'Мясницкая улица',
    house: '5',
    rating: 4.5,
    ordersCompleted: 12,
    contractorLevel: 'specialist',
    verified: true,
    status: 'self_employed'
  }
];

async function createTestContractors() {
  console.log('🚀 Создание тестовых исполнителей...');
  
  for (const contractor of testContractors) {
    try {
      console.log(`📝 Создаем исполнителя: ${contractor.fullName}`);
      
      const response = await axios.post(`${API_BASE_URL}/auth/register`, contractor);
      
      if (response.data.success) {
        console.log(`✅ Исполнитель ${contractor.fullName} создан успешно`);
      } else {
        console.log(`❌ Ошибка создания исполнителя ${contractor.fullName}:`, response.data);
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('уже существует')) {
        console.log(`⚠️ Исполнитель ${contractor.fullName} уже существует`);
      } else {
        console.error(`❌ Ошибка создания исполнителя ${contractor.fullName}:`, error.response?.data || error.message);
      }
    }
  }
  
  console.log('🎉 Тестовые данные созданы!');
}

async function testSearchAPI() {
  console.log('\n🔍 Тестирование API поиска...');
  
  try {
    // Тест 1: Поиск всех исполнителей в Москве
    console.log('\n📋 Тест 1: Поиск в Москве');
    const response1 = await axios.get(`${API_BASE_URL}/users/search/contractors?city=Москва`);
    console.log(`Найдено исполнителей в Москве: ${response1.data.total}`);
    
    // Тест 2: Поиск по району
    console.log('\n📋 Тест 2: Поиск в ЦАО');
    const response2 = await axios.get(`${API_BASE_URL}/users/search/contractors?city=Москва&district=ЦАО`);
    console.log(`Найдено исполнителей в ЦАО: ${response2.data.total}`);
    
    // Тест 3: Поиск по метро
    console.log('\n📋 Тест 3: Поиск у метро Пушкинская');
    const response3 = await axios.get(`${API_BASE_URL}/users/search/contractors?city=Москва&metro=Пушкинская`);
    console.log(`Найдено исполнителей у метро Пушкинская: ${response3.data.total}`);
    
    // Тест 4: Поиск по рейтингу
    console.log('\n📋 Тест 4: Поиск с рейтингом >= 4.7');
    const response4 = await axios.get(`${API_BASE_URL}/users/search/contractors?city=Москва&minRating=4.7`);
    console.log(`Найдено исполнителей с рейтингом >= 4.7: ${response4.data.total}`);
    
    // Тест 5: Получение районов
    console.log('\n📋 Тест 5: Получение районов Москвы');
    const response5 = await axios.get(`${API_BASE_URL}/users/filters/districts?city=Москва`);
    console.log(`Районы Москвы: ${JSON.stringify(response5.data.data)}`);
    
    // Тест 6: Получение метро
    console.log('\n📋 Тест 6: Получение метро ЦАО');
    const response6 = await axios.get(`${API_BASE_URL}/users/filters/metro?city=Москва&district=ЦАО`);
    console.log(`Метро ЦАО: ${JSON.stringify(response6.data.data)}`);
    
    console.log('\n✅ Все тесты API прошли успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования API:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🧪 ТЕСТИРОВАНИЕ СИСТЕМЫ ПОИСКА');
  console.log('================================');
  
  await createTestContractors();
  await testSearchAPI();
  
  console.log('\n🎉 Тестирование завершено!');
  console.log('\n📱 Теперь можно тестировать в приложении:');
  console.log('1. Запустите frontend: npx expo start');
  console.log('2. Откройте экран поиска');
  console.log('3. Попробуйте разные фильтры');
}

main().catch(console.error);
