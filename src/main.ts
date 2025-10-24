import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as cors from 'cors';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  
  // CORS
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  
  // Раздача статических файлов
  app.useStaticAssets(join(__dirname, '..', 'static'), {
    prefix: '/static/',
  });
  
  // Принудительная инициализация YooKassaService для проверки переменных окружения
  const yooKassaService = app.get('YooKassaService');
  console.log('🔍 YooKassaService инициализирован при запуске сервера');

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  // console.log(`🚀 Server running on http://localhost:${process.env.PORT ?? 3000, '0.0.0.0'}`);
  console.log(`🚀 Server running on http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`🌐 Server accessible on network: http://10.0.0.2:${process.env.PORT ?? 3000}`);
  console.log(`📁 Static files: http://localhost:${process.env.PORT ?? 3000}/static/`);
}
bootstrap();
