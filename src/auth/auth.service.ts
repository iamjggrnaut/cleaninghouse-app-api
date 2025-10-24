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
    status?: 'self_employed' | 'individual_entrepreneur';
    city?: string;
    citizenship?: string;
    passportSeries?: string;
    passportNumber?: string;
    passportIssuedBy?: string;
    passportIssueDate?: string;
  }) {
    console.log('🔍 AuthService.register: Получены данные для регистрации:', {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      role: data.role,
      status: data.status,
      city: data.city,
      citizenship: data.citizenship,
      passportSeries: data.passportSeries,
      passportNumber: data.passportNumber,
      passportIssuedBy: data.passportIssuedBy,
      passportIssueDate: data.passportIssueDate
    });
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
      status: data.status, // Добавляем статус
      city: data.city && data.city.trim() !== '' ? data.city : null, // Добавляем город
      citizenship: data.citizenship && data.citizenship.trim() !== '' ? data.citizenship : null,
      passportSeries: data.passportSeries && data.passportSeries.trim() !== '' ? data.passportSeries : null,
      passportNumber: data.passportNumber && data.passportNumber.trim() !== '' ? data.passportNumber : null,
      passportIssuedBy: data.passportIssuedBy && data.passportIssuedBy.trim() !== '' ? data.passportIssuedBy : null,
      passportIssueDate: data.passportIssueDate && data.passportIssueDate.trim() !== '' ? data.passportIssueDate : null,
    } as any);
    const savedUser = await this.usersRepo.save(user);
    const userEntity = Array.isArray(savedUser) ? savedUser[0] : savedUser;
    
    console.log('✅ AuthService.register: Пользователь создан:', {
      id: userEntity.id,
      fullName: userEntity.fullName,
      email: userEntity.email,
      role: userEntity.role,
      status: userEntity.status,
      city: userEntity.city,
      citizenship: userEntity.citizenship,
      passportSeries: userEntity.passportSeries,
      passportNumber: userEntity.passportNumber,
      passportIssuedBy: userEntity.passportIssuedBy,
      passportIssueDate: userEntity.passportIssueDate
    });
    
    // Отправляем приветственное письмо
    await this.emailService.sendWelcomeEmail(data.email, data.fullName);
    
    const tokens = this.issueTokens(userEntity);
    return { user: userEntity, ...tokens };
  }

  async login(data: { email: string; password: string }) {
    console.log('🔍 AuthService.login: Получены данные для входа:', {
      email: data.email,
      passwordLength: data.password?.length
    });

    const user = await this.usersRepo.findOne({
      where: { email: data.email },
      select: ['id', 'email', 'phone', 'fullName', 'role', 'passwordHash', 'rating', 'reviewsCount', 'ordersCompleted', 'avatar', 'city', 'status'],
    });

    console.log('🔍 AuthService.login: Найден пользователь:', {
      found: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasPasswordHash: !!user?.passwordHash
    });

    if (!user) {
      console.log('❌ AuthService.login: Пользователь не найден');
      throw new UnauthorizedException('Неверные учетные данные');
    }

    console.log('🔍 AuthService.login: Проверяем пароль...');
    const match = await bcrypt.compare(data.password, user.passwordHash);
    console.log('🔍 AuthService.login: Результат проверки пароля:', match);

    if (!match) {
      console.log('❌ AuthService.login: Неверный пароль');
      throw new UnauthorizedException('Неверные учетные данные');
    }

    console.log('✅ AuthService.login: Успешная авторизация');
    const tokens = this.issueTokens(user);
    return { user, ...tokens };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken);
      const user = await this.usersRepo.findOne({ 
        where: { id: payload.userId },
        select: ['id', 'email', 'phone', 'fullName', 'role', 'rating', 'reviewsCount', 'ordersCompleted', 'avatar', 'city', 'status', 'verified', 'createdAt', 'updatedAt', 'citizenship', 'passportSeries', 'passportNumber', 'passportIssuedBy', 'passportIssueDate', 'verificationDate', 'pushEnabled', 'pushToken', 'emailNotificationsEnabled', 'lastLoginAt']
      });
      if (!user) throw new UnauthorizedException();
      const tokens = this.issueTokens(user);
      return { user, ...tokens };
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
