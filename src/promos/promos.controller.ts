import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PromosService } from './promos.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('promos')
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  // Получить все активные акции (доступно всем)
  @Get()
  async getActivePromos() {
    const promos = await this.promosService.getActivePromos();
    return { success: true, data: promos };
  }

  // Получить промо по ID (доступно всем)
  @Get(':id')
  async getPromoById(@Param('id') id: string) {
    const promo = await this.promosService.getPromoById(id);
    return { success: true, data: promo };
  }

  // CRUD операции для админа
  @Post()
  @UseGuards(JwtAuthGuard)
  async createPromo(@Body() body: any) {
    const promo = await this.promosService.createPromo(body);
    return { success: true, data: promo };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updatePromo(@Param('id') id: string, @Body() body: any) {
    const promo = await this.promosService.updatePromo(id, body);
    return { success: true, data: promo };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePromo(@Param('id') id: string) {
    await this.promosService.deletePromo(id);
    return { success: true };
  }
}

