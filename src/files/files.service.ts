import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as sharp from 'sharp';

@Injectable()
export class FilesService {
  private readonly staticPath = join(process.cwd(), 'static');

  async processImage(filepath: string, category: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filepath);
      const filename = filepath.split(/[\/\\]/).pop()!;
      const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png)$/i, '');
      const webpFilename = `${nameWithoutExt}.webp`;
      const categoryPath = join(this.staticPath, category);

      // Настройки обработки в зависимости от категории
      let width = 1200;
      let height = 1200;
      let quality = 90;

      if (category === 'avatars') {
        width = 400;
        height = 400;
        quality = 85;
        
        // Создаем thumbnail для аватара
        await sharp(buffer)
          .resize(200, 200, { fit: 'cover', position: 'center' })
          .webp({ quality: 80 })
          .toFile(join(categoryPath, `${nameWithoutExt}-thumb.webp`));
      }

      if (category === 'orders' || category === 'reviews') {
        width = 1200;
        height = 900;
      }

      if (category === 'promos') {
        width = 800;
        height = 600;
      }

      // Обрабатываем основное изображение
      await sharp(buffer)
        .resize(width, height, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .webp({ quality })
        .toFile(join(categoryPath, webpFilename));

      // Удаляем оригинальный файл
      await fs.unlink(filepath);

      return webpFilename;
    } catch (error) {
      console.error('Image processing error:', error);
      throw new BadRequestException('Failed to process image');
    }
  }

  async deleteFile(category: string, filename: string): Promise<void> {
    try {
      const filepath = join(this.staticPath, category, filename);
      await fs.unlink(filepath);

      // Удаляем thumbnail если есть
      if (category === 'avatars' && !filename.includes('-thumb')) {
        const thumbPath = join(
          this.staticPath,
          category,
          filename.replace('.webp', '-thumb.webp')
        );
        try {
          await fs.unlink(thumbPath);
        } catch (err) {
          // Thumbnail может не существовать
        }
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new NotFoundException('File not found');
      }
      throw error;
    }
  }

  async fileExists(category: string, filename: string): Promise<boolean> {
    try {
      const filepath = join(this.staticPath, category, filename);
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  getFileUrl(category: string, filename: string): string {
    return `/static/${category}/${filename}`;
  }
}

