import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly jwt: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(data: { 
    fullName: string; 
    phone: string; 
    email: string; 
    password: string; 
    role?: UserRole;
    citizenship?: string;
    passportSeries?: string;
    passportNumber?: string;
    passportIssuedBy?: string;
    passportIssueDate?: string;
  }) {
    // Проверяем существующих пользователей по email и телефону отдельно
    const existingByEmail = await this.usersRepo.findOne({ where: { email: data.email } });
    if (existingByEmail) {
      throw new UnauthorizedException('Пользователь с таким email уже существует');
    }
    
    const existingByPhone = await this.usersRepo.findOne({ where: { phone: data.phone } });
    if (existingByPhone) {
      throw new UnauthorizedException('Пользователь с таким номером телефона уже существует');
    }
    const user = this.usersRepo.create({
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      role: data.role || UserRole.CUSTOMER,
      passwordHash: await bcrypt.hash(data.password, 10),
      citizenship: data.citizenship,
      passportSeries: data.passportSeries,
      passportNumber: data.passportNumber,
      passportIssuedBy: data.passportIssuedBy,
      passportIssueDate: data.passportIssueDate,
    });
    await this.usersRepo.save(user);
    
    // Отправляем приветственное письмо
    await this.emailService.sendWelcomeEmail(data.email, data.fullName);
    
    const tokens = this.issueTokens(user);
    return { user, ...tokens };
  }

  async login(data: { email: string; password: string }) {
    const user = await this.usersRepo.findOne({
      where: { email: data.email },
      select: ['id', 'email', 'phone', 'fullName', 'role', 'passwordHash', 'rating', 'reviewsCount', 'ordersCompleted'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(data.password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    const tokens = this.issueTokens(user);
    return { user, ...tokens };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken);
      const user = await this.usersRepo.findOne({ where: { id: payload.userId } });
      if (!user) throw new UnauthorizedException();
      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private issueTokens(user: User) {
    const payload = { sub: user.id, userId: user.id, role: user.role };
    const accessToken = this.jwt.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwt.sign(payload, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }

  // Verification codes storage (in-memory, for DEV; use Redis in production)
  private codes = new Map<string, { code: string; expiresAt: number; type: 'registration' | 'reset' }>();

  private generateCode(): string {
    // В production генерируем случайный код
    if (process.env.NODE_ENV === 'production') {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
    // В DEV всегда 123456 для упрощения тестирования
    return '123456';
  }

  async requestCode(email: string, type: 'registration' | 'reset' = 'registration') {
    const code = this.generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 минут

    this.codes.set(email, { code, expiresAt, type });

    // Отправляем email
    if (type === 'registration') {
      await this.emailService.sendVerificationCode(email, code);
    } else {
      await this.emailService.sendPasswordResetCode(email, code);
    }

    const isDev = process.env.NODE_ENV !== 'production';
    console.log(`📧 [${type}] Code for ${email}: ${code}`);
    console.log(`⏰ Код действителен до: ${new Date(expiresAt).toLocaleString()}`);
    
    return { sent: true, devCode: isDev ? code : undefined } as any;
  }

  async verifyCode(email: string, code: string, type: 'registration' | 'reset' = 'registration') {
    console.log(`🔐 Проверяем код для ${email}: ${code} (тип: ${type})`);
    
    const entry = this.codes.get(email);
    
    if (!entry) {
      console.log(`❌ Код не найден для ${email}`);
      throw new UnauthorizedException('Code not found. Please request a new code.');
    }

    console.log(`📋 Найденный код: ${entry.code}, истекает: ${new Date(entry.expiresAt).toLocaleString()}`);
    console.log(`⏰ Текущее время: ${new Date().toLocaleString()}`);
    console.log(`⏰ Код действителен: ${entry.expiresAt > Date.now()}`);

    if (entry.expiresAt < Date.now()) {
      console.log(`❌ Код истек для ${email}`);
      this.codes.delete(email);
      throw new UnauthorizedException('Code expired. Please request a new code.');
    }

    if (entry.code !== code) {
      console.log(`❌ Неправильный код для ${email}. Ожидался: ${entry.code}, получен: ${code}`);
      throw new UnauthorizedException('Invalid code');
    }

    if (entry.type !== type) {
      console.log(`❌ Неправильный тип кода для ${email}. Ожидался: ${entry.type}, получен: ${type}`);
      throw new UnauthorizedException('Invalid code type');
    }

    console.log(`✅ Код подтвержден для ${email}`);
    this.codes.delete(email);
    return { verified: true };
  }

  async resetPassword(email: string, newPassword: string) {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.save(user);

    return { success: true };
  }
}
