import { Body, Controller, Delete, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentStatus } from './payment.entity';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  async create(@Body() body: { orderId: string; userId: string; amount: number }) {
    const payment = await this.payments.create(body);
    return { success: true, data: payment };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const payment = await this.payments.findById(id);
    return { success: true, data: payment };
  }

  @Post(':id/capture')
  async capture(@Param('id') id: string) {
    const payment = await this.payments.capture(id);
    return { success: true, data: payment };
  }

  // DEV webhook mock
  @Post(':id/webhook')
  async webhook(@Param('id') id: string, @Body('status') status: PaymentStatus) {
    const payment = await this.payments.webhookMock(id, status);
    return { success: true, data: payment };
  }

  // Payment methods
  @UseGuards(JwtAuthGuard)
  @Post('methods')
  async saveMethod(@Request() req: any, @Body() body: { yookassaPaymentMethodId: string; cardLast4: string; cardType: string }) {
    const method = await this.payments.savePaymentMethod(req.user.userId, body);
    return { success: true, data: method };
  }

  @UseGuards(JwtAuthGuard)
  @Get('methods/list')
  async getMethods(@Request() req: any) {
    const methods = await this.payments.getPaymentMethods(req.user.userId);
    return { success: true, data: methods };
  }

  @UseGuards(JwtAuthGuard)
  @Post('methods/:id/default')
  async setDefault(@Request() req: any, @Param('id') id: string) {
    const method = await this.payments.setDefaultPaymentMethod(req.user.userId, id);
    return { success: true, data: method };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('methods/:id')
  async deleteMethod(@Param('id') id: string) {
    await this.payments.deletePaymentMethod(id);
    return { success: true };
  }

  // Manual retry trigger (for dev/admin)
  @Post('payouts/retry')
  async retryPayouts() {
    await this.payments.retryFailedPayouts();
    return { success: true, message: 'Retry triggered' };
  }

  // Balance and transactions
  @UseGuards(JwtAuthGuard)
  @Get('balance')
  async getBalance(@Request() req: any) {
    const balance = await this.payments.getBalance(req.user.userId);
    return { success: true, data: balance };
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(@Request() req: any) {
    const transactions = await this.payments.getTransactions(req.user.userId);
    return { success: true, data: transactions };
  }
}
