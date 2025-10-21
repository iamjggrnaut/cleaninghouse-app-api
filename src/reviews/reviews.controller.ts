import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Создать отзыв
  @Post()
  async createReview(@Req() req: any, @Body() body: any) {
    const reviewerId = req.user.userId;
    const review = await this.reviewsService.createReview({
      ...body,
      reviewerId,
    });
    return { success: true, data: review };
  }

  // Получить отзывы пользователя
  @Get('user/:userId')
  async getReviewsByUser(@Param('userId') userId: string) {
    const reviews = await this.reviewsService.getReviewsByUser(userId);
    return { success: true, data: reviews };
  }

  // Получить отзыв по заказу
  @Get('order/:orderId')
  async getReviewByOrder(
    @Param('orderId') orderId: string,
    @Req() req: any,
  ) {
    const reviewerId = req.user.userId;
    const review = await this.reviewsService.getReviewByOrder(
      orderId,
      reviewerId,
    );
    return { success: true, data: review };
  }

  // Удалить отзыв
  @Delete(':id')
  async deleteReview(@Param('id') id: string, @Req() req: any) {
    const reviewerId = req.user.userId;
    await this.reviewsService.deleteReview(id, reviewerId);
    return { success: true };
  }
}

