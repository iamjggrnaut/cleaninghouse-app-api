import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';
import { Order } from '../entities/order.entity';
import { User } from '../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepo: Repository<Review>,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Создать отзыв
   */
  async createReview(data: {
    orderId: string;
    reviewerId: string;
    rating: number;
    comment?: string;
    photos?: string[];
  }): Promise<Review> {
    // Проверяем заказ
    const order = await this.ordersRepo.findOne({
      where: { id: data.orderId },
      relations: ['customer', 'contractor'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'completed') {
      throw new BadRequestException('Can only review completed orders');
    }

    // Определяем кто о ком отзыв
    const isCustomer = order.customer.id === data.reviewerId;
    const revieweeId = isCustomer ? order.contractor?.id : order.customer.id;

    if (!revieweeId) {
      throw new BadRequestException('Reviewee not found');
    }

    // Проверяем что отзыв еще не оставлен
    const existingReview = await this.reviewsRepo.findOne({
      where: {
        orderId: data.orderId,
        reviewerId: data.reviewerId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('Review already exists');
    }

    // Валидация рейтинга
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const reviewer = await this.usersRepo.findOne({ where: { id: data.reviewerId } });
    const reviewee = await this.usersRepo.findOne({ where: { id: revieweeId } });

    if (!reviewer || !reviewee) {
      throw new NotFoundException('User not found');
    }

    // Создаем отзыв
    const review = this.reviewsRepo.create({
      order,
      orderId: data.orderId,
      reviewer,
      reviewerId: data.reviewerId,
      reviewee,
      revieweeId,
      rating: data.rating,
      comment: data.comment,
      photos: data.photos || [],
    });

    const saved = await this.reviewsRepo.save(review) as unknown as Review;

    // Обновляем рейтинг пользователя
    await this.updateUserRating(revieweeId);

    // Уведомление о новом отзыве
    await this.notificationsService.notifyReviewReceived(
      revieweeId,
      reviewer.fullName,
      data.rating,
    );

    return saved;
  }

  /**
   * Получить отзывы пользователя
   */
  async getReviewsByUser(userId: string): Promise<Review[]> {
    return this.reviewsRepo.find({
      where: { revieweeId: userId },
      relations: ['reviewer', 'order'],
      order: { createdAt: 'DESC' as any },
    });
  }

  /**
   * Получить отзыв по заказу
   */
  async getReviewByOrder(orderId: string, reviewerId: string): Promise<Review | null> {
    return this.reviewsRepo.findOne({
      where: { orderId, reviewerId },
      relations: ['reviewer', 'reviewee'],
    });
  }

  /**
   * Обновить рейтинг пользователя
   */
  private async updateUserRating(userId: string): Promise<void> {
    const reviews = await this.reviewsRepo.find({
      where: { revieweeId: userId },
    });

    if (reviews.length === 0) return;

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = totalRating / reviews.length;

    await this.usersRepo.update(userId, {
      rating: Math.round(avgRating * 10) / 10, // Округляем до 1 знака
      reviewsCount: reviews.length,
    });
  }

  /**
   * Удалить отзыв (только свой)
   */
  async deleteReview(reviewId: string, reviewerId: string): Promise<void> {
    const review = await this.reviewsRepo.findOne({
      where: { id: reviewId, reviewerId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const revieweeId = review.revieweeId;
    await this.reviewsRepo.remove(review);

    // Пересчитываем рейтинг
    await this.updateUserRating(revieweeId);
  }
}

