import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // Создание приглашения
  @Post()
  async createInvitation(@Req() req: any, @Body() body: any) {
    const customerId = req.user.userId;
    const invitation = await this.invitationsService.createInvitation({
      customerId,
      contractorId: body.contractorId,
      personalizedOrderId: body.personalizedOrderId,
      message: body.message,
    });
    return { success: true, data: invitation };
  }

  // Получение приглашений для исполнителя
  @Get('contractor')
  async getContractorInvitations(@Req() req: any) {
    const contractorId = req.user.userId;
    const invitations = await this.invitationsService.getContractorInvitations(contractorId);
    return { success: true, data: invitations };
  }

  // Получение приглашений для заказчика
  @Get('customer')
  async getCustomerInvitations(@Req() req: any) {
    const customerId = req.user.userId;
    const invitations = await this.invitationsService.getCustomerInvitations(customerId);
    return { success: true, data: invitations };
  }

  // Принятие приглашения
  @Put(':id/accept')
  async acceptInvitation(@Req() req: any, @Param('id') invitationId: string) {
    const contractorId = req.user.userId;
    const invitation = await this.invitationsService.acceptInvitation(invitationId, contractorId);
    return { success: true, data: invitation };
  }

  // Отклонение приглашения
  @Put(':id/reject')
  async rejectInvitation(
    @Req() req: any, 
    @Param('id') invitationId: string, 
    @Body() body: { rejectionReason: string }
  ) {
    const contractorId = req.user.userId;
    const invitation = await this.invitationsService.rejectInvitation(
      invitationId, 
      contractorId, 
      body.rejectionReason
    );
    return { success: true, data: invitation };
  }

  // Отмена приглашения
  @Put(':id/cancel')
  async cancelInvitation(@Req() req: any, @Param('id') invitationId: string) {
    const customerId = req.user.userId;
    const invitation = await this.invitationsService.cancelInvitation(invitationId, customerId);
    return { success: true, data: invitation };
  }

  // Отказ от приглашения исполнителем (отмена холда)
  @Put(':id/decline')
  async declineInvitation(@Req() req: any, @Param('id') invitationId: string) {
    const contractorId = req.user.userId;
    const invitation = await this.invitationsService.declineInvitation(invitationId, contractorId);
    return { success: true, data: invitation };
  }

  // Завершение заказа исполнителем
  @Put(':id/complete')
  async completeInvitation(@Req() req: any, @Param('id') invitationId: string) {
    const contractorId = req.user.userId;
    const invitation = await this.invitationsService.completeInvitation(invitationId, contractorId);
    return { success: true, data: invitation };
  }

  // Подтверждение заказа заказчиком (списание средств)
  @Put(':id/confirm')
  async confirmInvitation(@Req() req: any, @Param('id') invitationId: string) {
    const customerId = req.user.userId;
    const invitation = await this.invitationsService.confirmInvitation(invitationId, customerId);
    return { success: true, data: invitation };
  }
}
