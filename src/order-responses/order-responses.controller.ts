import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrderResponsesService } from './order-responses.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('order-responses')
@UseGuards(JwtAuthGuard)
export class OrderResponsesController {
  constructor(
    private readonly orderResponsesService: OrderResponsesService,
  ) {}

  // Исполнитель откликается на заказ
  @Post()
  async createResponse(@Req() req: any, @Body() body: any) {
    const contractorId = req.user.userId;
    const response = await this.orderResponsesService.createResponse({
      ...body,
      contractorId,
    });
    return { success: true, data: response };
  }

  // Получить отклики на заказ (для клиента)
  @Get('order/:orderId')
  async getResponsesByOrder(@Param('orderId') orderId: string) {
    const responses = await this.orderResponsesService.getResponsesByOrder(
      orderId,
    );
    return { success: true, data: responses };
  }

  // Получить отклики исполнителя
  @Get('my-responses')
  async getMyResponses(@Req() req: any) {
    const contractorId = req.user.userId;
    const responses = await this.orderResponsesService.getResponsesByContractor(
      contractorId,
    );
    return { success: true, data: responses };
  }

  // Клиент принимает отклик
  @Post(':id/accept')
  async acceptResponse(@Req() req: any, @Param('id') id: string) {
    const customerId = req.user.userId;
    const order = await this.orderResponsesService.acceptResponse(
      id,
      customerId,
    );
    return { success: true, data: order };
  }

  // Клиент отклоняет отклик
  @Post(':id/reject')
  async rejectResponse(@Req() req: any, @Param('id') id: string) {
    const customerId = req.user.userId;
    const response = await this.orderResponsesService.rejectResponse(
      id,
      customerId,
    );
    return { success: true, data: response };
  }

  // Исполнитель отзывает отклик
  @Post(':id/withdraw')
  async withdrawResponse(@Req() req: any, @Param('id') id: string) {
    const contractorId = req.user.userId;
    const response = await this.orderResponsesService.withdrawResponse(
      id,
      contractorId,
    );
    return { success: true, data: response };
  }

  // Получить количество откликов на заказ
  @Get('order/:orderId/count')
  async getResponsesCount(@Param('orderId') orderId: string) {
    const count = await this.orderResponsesService.getResponsesCount(orderId);
    return { success: true, data: { count } };
  }
}

