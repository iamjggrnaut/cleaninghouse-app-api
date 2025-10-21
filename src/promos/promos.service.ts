import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Promo } from '../entities/promo.entity';

@Injectable()
export class PromosService {
  constructor(
    @InjectRepository(Promo)
    private readonly promosRepo: Repository<Promo>,
  ) {}

  /**
   * Получить все активные акции
   */
  async getActivePromos(): Promise<Promo[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.promosRepo.find({
      where: {
        isActive: true,
      },
      order: {
        createdAt: 'DESC' as any,
      },
    });
  }

  /**
   * Получить промо по ID
   */
  async getPromoById(id: string): Promise<Promo | null> {
    return this.promosRepo.findOne({ where: { id } });
  }

  /**
   * Создать промо (admin)
   */
  async createPromo(data: Partial<Promo>): Promise<Promo> {
    const promo = this.promosRepo.create(data);
    return this.promosRepo.save(promo) as unknown as Promo;
  }

  /**
   * Обновить промо (admin)
   */
  async updatePromo(id: string, data: Partial<Promo>): Promise<Promo> {
    await this.promosRepo.update(id, data);
    return this.promosRepo.findOne({ where: { id } }) as unknown as Promo;
  }

  /**
   * Удалить промо (admin)
   */
  async deletePromo(id: string): Promise<void> {
    await this.promosRepo.delete(id);
  }
}

