import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, ContractorLevel } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly usersRepo: Repository<User>) {}

  findById(id: string) {
    return this.usersRepo.findOne({ where: { id } });
  }

  async update(id: string, updates: Partial<User>) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, updates);
    return this.usersRepo.save(user);
  }

  async findSpecialists() {
    return this.usersRepo.find({ 
      where: { role: UserRole.CONTRACTOR },
      select: ['id', 'fullName', 'email', 'phone', 'avatar', 'rating', 'ordersCompleted', 'city', 'status', 'contractorLevel', 'verified', 'createdAt']
    });
  }

  // Увеличиваем счетчик выполненных заказов
  async incrementOrdersCompleted(userId: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    
    user.ordersCompleted = (user.ordersCompleted || 0) + 1;
    await this.usersRepo.save(user);
    
    // Проверяем и обновляем уровень
    await this.updateContractorLevel(userId);
    
    return user;
  }

  // Обновляем уровень исполнителя на основе количества выполненных заказов
  async updateContractorLevel(userId: string) {
    const user = await this.findById(userId);
    if (!user || user.role !== UserRole.CONTRACTOR) return;
    
    const completedOrders = user.ordersCompleted || 0;
    let newLevel = ContractorLevel.SPECIALIST;
    
    if (completedOrders >= 300) {
      newLevel = ContractorLevel.EXPERT;
    } else if (completedOrders >= 150) {
      newLevel = ContractorLevel.PROFESSIONAL;
    }
    
    // Обновляем уровень только если он изменился
    if (user.contractorLevel !== newLevel) {
      user.contractorLevel = newLevel;
      await this.usersRepo.save(user);
      
      console.log(`🎯 Уровень исполнителя ${user.fullName} обновлен: ${newLevel} (${completedOrders} заказов)`);
    }
  }

  // Получаем информацию об уровне исполнителя
  getContractorLevelInfo(level: ContractorLevel) {
    switch (level) {
      case ContractorLevel.SPECIALIST:
        return {
          label: 'Специалист',
          color: '#4CAF50',
          commission: 0.15,
          minOrders: 0,
          maxOrders: 149
        };
      case ContractorLevel.PROFESSIONAL:
        return {
          label: 'Профессионал',
          color: '#2196F3', 
          commission: 0.12,
          minOrders: 150,
          maxOrders: 299
        };
      case ContractorLevel.EXPERT:
        return {
          label: 'Эксперт',
          color: '#FF9800',
          commission: 0.10,
          minOrders: 300,
          maxOrders: Infinity
        };
      default:
        return {
          label: 'Специалист',
          color: '#4CAF50',
          commission: 0.15,
          minOrders: 0,
          maxOrders: 149
        };
    }
  }
}


