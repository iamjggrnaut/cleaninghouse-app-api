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

  async register(data: { fullName: string; phone: string; email: string; password: string; role?: UserRole }) {
    const existing = await this.usersRepo.findOne({ where: [{ phone: data.phone }, { email: data.email }] });
    if (existing) {
      throw new UnauthorizedException('User already exists');
    }
    const user = this.usersRepo.create({
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      role: data.role || UserRole.CUSTOMER,
      passwordHash: await bcrypt.hash(data.password, 10),
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
      select: ['id', 'email', 'phone', 'fullName', 'role', 'passwordHash', 'rating', 'reviewsCount', 'ordersCompleted', 'avatar', 'city', 'verified', 'createdAt', 'updatedAt', 'citizenship', 'passportSeries', 'passportNumber', 'passportIssuedBy', 'passportIssueDate', 'verificationDate', 'pushEnabled', 'pushToken', 'emailNotificationsEnabled', 'lastLoginAt'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(data.password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    
    // Обновляем время последнего входа
    await this.usersRepo.update(user.id, { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();
    
    const tokens = this.issueTokens(user);
    return { user, ...tokens };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken);
      const user = await this.usersRepo.findOne({ 
        where: { id: payload.userId },
        select: ['id', 'email', 'phone', 'fullName', 'role', 'rating', 'reviewsCount', 'ordersCompleted', 'avatar', 'city', 'verified', 'createdAt', 'updatedAt', 'citizenship', 'passportSeries', 'passportNumber', 'passportIssuedBy', 'passportIssueDate', 'verificationDate', 'pushEnabled', 'pushToken', 'emailNotificationsEnabled', 'lastLoginAt']
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
    
    return { sent: true, devCode: isDev ? code : undefined } as any;
  }

  async verifyCode(email: string, code: string, type: 'registration' | 'reset' = 'registration') {
    const entry = this.codes.get(email);
    
    if (!entry) {
      throw new UnauthorizedException('Code not found. Please request a new code.');
    }

    if (entry.expiresAt < Date.now()) {
      this.codes.delete(email);
      throw new UnauthorizedException('Code expired. Please request a new code.');
    }

    if (entry.code !== code) {
      throw new UnauthorizedException('Invalid code');
    }

    if (entry.type !== type) {
      throw new UnauthorizedException('Invalid code type');
    }

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
