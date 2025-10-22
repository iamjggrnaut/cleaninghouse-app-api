import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PersonalizedOrdersService } from './personalized-orders.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('personalized-orders')
@UseGuards(JwtAuthGuard)
export class PersonalizedOrdersController {
  constructor(private readonly personalizedOrdersService: PersonalizedOrdersService) {}

  // Создание персонализированного заказа
  @Post()
  async createPersonalizedOrder(@Req() req: any, @Body() body: any) {
    const customerId = req.user.userId;
    const order = await this.personalizedOrdersService.createPersonalizedOrder({
      customerId,
      contractorId: body.contractorId,
      title: body.title,
      description: body.description,
      budget: body.budget,
      fullAddress: body.fullAddress,
      customerPhone: body.customerPhone,
      scheduledDate: new Date(body.scheduledDate),
      specialInstructions: body.specialInstructions,
      estimatedDuration: body.estimatedDuration,
    });
    return { success: true, data: order };
  }

  // Получение заказов для исполнителя
  @Get('contractor')
  async getContractorOrders(@Req() req: any) {
    const contractorId = req.user.userId;
    const orders = await this.personalizedOrdersService.getContractorOrders(contractorId);
    return { success: true, data: orders };
  }

  // Получение заказов для заказчика
  @Get('customer')
  async getCustomerOrders(@Req() req: any) {
    const customerId = req.user.userId;
    const orders = await this.personalizedOrdersService.getCustomerOrders(customerId);
    return { success: true, data: orders };
  }

  // Завершение заказа исполнителем
  @Put(':id/complete')
  async contractorComplete(@Req() req: any, @Param('id') orderId: string) {
    const contractorId = req.user.userId;
    const order = await this.personalizedOrdersService.contractorComplete(orderId, contractorId);
    return { success: true, data: order };
  }

  // Подтверждение завершения заказчиком
  @Put(':id/confirm')
  async customerConfirm(@Req() req: any, @Param('id') orderId: string) {
    const customerId = req.user.userId;
    const order = await this.personalizedOrdersService.customerConfirm(orderId, customerId);
    return { success: true, data: order };
  }

  // Отмена заказа
  @Put(':id/cancel')
  async cancelOrder(@Req() req: any, @Param('id') orderId: string) {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const order = await this.personalizedOrdersService.cancelOrder(orderId, userId, userRole);
    return { success: true, data: order };
  }
}
