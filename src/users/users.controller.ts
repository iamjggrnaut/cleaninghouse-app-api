import { Body, Controller, Get, Param, Put, Post, UseGuards, Req, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SearchFiltersDto } from './dto/search.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('specialists')
  async getSpecialists() {
    const specialists = await this.usersService.findSpecialists();
    return { success: true, data: specialists };
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.usersService.findById(id).then((data) => ({ success: true, data }));
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updates: any) {
    const user = await this.usersService.update(id, updates);
    return { success: true, data: user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('register-push-token')
  async registerPushToken(@Req() req: any, @Body('pushToken') pushToken: string) {
    const userId = req.user.userId;
    const user = await this.usersService.update(userId, { pushToken });
    return { success: true, data: { pushToken: user.pushToken } };
  }

  // Поиск исполнителей по фильтрам
  @Get('search/contractors')
  async searchContractors(@Query() filters: SearchFiltersDto) {
    const result = await this.usersService.searchContractors(filters);
    return { 
      success: true, 
      data: result.users,
      total: result.total,
      filters: result.filters
    };
  }

  // Получить список районов для фильтра
  @Get('filters/districts')
  async getDistricts(@Query('city') city?: string) {
    const districts = await this.usersService.getDistricts(city);
    return { success: true, data: districts };
  }

  // Получить список метро для фильтра
  @Get('filters/metro')
  async getMetroStations(
    @Query('city') city?: string,
    @Query('district') district?: string
  ) {
    const metroStations = await this.usersService.getMetroStations(city, district);
    return { success: true, data: metroStations };
  }
}


