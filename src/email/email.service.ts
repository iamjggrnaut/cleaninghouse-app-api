import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // В DEV режиме используем ethereal.email (тестовый SMTP)
    // В production используем настоящий SMTP (Gmail, SendGrid, AWS SES, etc.)
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      console.log('📧 Email service: Production mode');
      console.log(`📧 SMTP Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
      console.log(`📧 SMTP User: ${process.env.SMTP_USER}`);
      console.log(`📧 SMTP Secure: ${process.env.SMTP_SECURE}`);
    } else {
      // DEV: используем Ethereal (тестовый SMTP, письма не отправляются реально)
      // Или можно использовать Gmail для теста
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'your-ethereal-user@ethereal.email',
          pass: 'your-ethereal-password',
        },
      });

      console.log('📧 Email service: DEV mode (Ethereal SMTP)');
      console.log('📧 Emails will not be sent. Check console for codes.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // В DEV режиме просто логируем
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 [DEV] Email would be sent:');
        console.log('   To:', options.to);
        console.log('   Subject:', options.subject);
        console.log('   Text:', options.text);
        return true;
      }

      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"CleaningHouse Premium" <noreply@cleaninghouse-premium.ru>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      });

      console.log('📧 Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('📧 Email send error:', error);
      return false;
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    const subject = 'Код подтверждения - CleaningHouse';
    const text = `
Ваш код подтверждения: ${code}

Введите этот код в приложении для завершения регистрации.

Код действителен 10 минут.

--
CleaningHouse Premium
https://cleaninghouse-premium.ru
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; letter-spacing: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CleaningHouse Premium</h1>
    </div>
    <div class="content">
      <h2>Код подтверждения</h2>
      <p>Введите этот код в приложении для завершения регистрации:</p>
      <div class="code">${code}</div>
      <p><strong>Код действителен 10 минут.</strong></p>
      <p>Если вы не регистрировались на нашей платформе, проигнорируйте это письмо.</p>
    </div>
    <div class="footer">
      <p>CleaningHouse Premium - платформа для поиска клинеров</p>
      <p><a href="https://cleaninghouse-premium.ru">cleaninghouse-premium.ru</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendPasswordResetCode(email: string, code: string): Promise<boolean> {
    const subject = 'Восстановление пароля - CleaningHouse';
    const text = `
Код для восстановления пароля: ${code}

Введите этот код в приложении для сброса пароля.

Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.

Код действителен 10 минут.

--
CleaningHouse Premium
https://cleaninghouse-premium.ru
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; letter-spacing: 5px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Восстановление пароля</h1>
    </div>
    <div class="content">
      <h2>Код для сброса пароля</h2>
      <p>Вы запросили восстановление пароля. Введите этот код в приложении:</p>
      <div class="code">${code}</div>
      <p><strong>Код действителен 10 минут.</strong></p>
      <div class="warning">
        <strong>⚠️ Безопасность:</strong> Если вы не запрашивали восстановление пароля, проигнорируйте это письмо и убедитесь, что ваш аккаунт защищен.
      </div>
    </div>
    <div class="footer">
      <p>CleaningHouse Premium - платформа для поиска клинеров</p>
      <p><a href="https://cleaninghouse-premium.ru">cleaninghouse-premium.ru</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({ to: email, subject, text, html });
  }

  async sendWelcomeEmail(email: string, fullName: string): Promise<boolean> {
    const subject = 'Добро пожаловать в CleaningHouse!';
    const text = `
Здравствуйте, ${fullName}!

Добро пожаловать в CleaningHouse Premium!

Теперь вы можете:
- Создавать заказы на уборку
- Находить проверенных исполнителей
- Отслеживать статус заказов
- Оставлять отзывы

Начните с создания вашего первого заказа!

--
CleaningHouse Premium
https://cleaninghouse-premium.ru
    `.trim();

    return this.sendEmail({ to: email, subject, text });
  }
}

