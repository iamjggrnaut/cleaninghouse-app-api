import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('read') read?: string,
  ) {
    const userId = req.user.userId;
    const readFilter = read === 'true' ? true : read === 'false' ? false : undefined;
    const notifications = await this.notificationsService.findAllByUser(
      userId,
      readFilter,
    );
    return { success: true, data: notifications };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.userId;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { success: true, data: { count } };
  }

  @Post(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    const notification = await this.notificationsService.markAsRead(id, userId);
    return { success: true, data: notification };
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.userId;
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    await this.notificationsService.deleteNotification(id, userId);
    return { success: true };
  }
}

