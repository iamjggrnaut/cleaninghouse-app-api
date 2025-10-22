import { Body, Controller, Get, Param, Put, Post, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Get('specialists')
  async getSpecialists() {
    const specialists = await this.usersService.findSpecialists();
    return { success: true, data: specialists };
  }
}


