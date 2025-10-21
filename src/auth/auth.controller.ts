import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    const result = await this.auth.register(body);
    return { success: true, data: result };
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const result = await this.auth.login(body);
    return { success: true, data: result };
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    const result = await this.auth.refreshToken(refreshToken);
    return { success: true, data: result };
  }

  // Запрос кода верификации (регистрация)
  @Post('request-code')
  async requestCode(@Body() body: { email: string; type?: 'registration' | 'reset' }) {
    const result = await this.auth.requestCode(body.email, body.type || 'registration');
    return { success: true, data: result };
  }

  // Подтверждение кода
  @Post('verify-code')
  async verifyCode(@Body() body: { email: string; code: string; type?: 'registration' | 'reset' }) {
    const result = await this.auth.verifyCode(body.email, body.code, body.type || 'registration');
    return { success: true, data: result };
  }

  // Запрос кода для сброса пароля
  @Post('request-reset-code')
  async requestResetCode(@Body('email') email: string) {
    const result = await this.auth.requestCode(email, 'reset');
    return { success: true, data: result };
  }

  // Сброс пароля (после верификации кода)
  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; newPassword: string }) {
    const result = await this.auth.resetPassword(body.email, body.newPassword);
    return { success: true, data: result };
  }
}
