import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list() {
    return this.orders.findAll().then((data) => ({ success: true, data }));
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.orders.findById(id).then((data) => {
      if (!data) {
        return { success: false, message: 'Order not found' };
      }
      return { success: true, data };
    });
  }

  @Post()
  create(@Body() body: any) {
    return this.orders.create(body).then((data) => ({ success: true, data }));
  }

  @Post(':id/complete')
  contractorComplete(@Param('id') id: string, @Body('contractorId') contractorId: string) {
    return this.orders.contractorComplete(id, contractorId).then((data) => ({ success: true, data }));
  }

  @Post(':id/confirm')
  customerConfirm(@Param('id') id: string, @Body('customerId') customerId: string) {
    return this.orders.customerConfirm(id, customerId).then((data) => ({ success: true, data }));
  }

  @Post(':id/decline')
  contractorDecline(@Param('id') id: string, @Body('contractorId') contractorId: string) {
    return this.orders.contractorDecline(id, contractorId).then((data) => ({ success: true }));
  }

  @Delete(':id')
  deleteIfNoContractor(@Param('id') id: string, @Body('customerId') customerId: string) {
    return this.orders.deleteIfNoContractor(id, customerId).then(() => ({ success: true }));
  }
}


