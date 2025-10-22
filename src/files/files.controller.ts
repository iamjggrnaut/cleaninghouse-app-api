import {
  Controller,
  Post,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category?: string,
  ) {
    console.log('📁 Upload request:', { hasFile: !!file, mimetype: file?.mimetype, size: file?.size, category });

    if (!file) {
      throw new BadRequestException('No file uploaded (expected field name "file")');
    }

    if (!category) {
      throw new BadRequestException('Category is required (avatars|orders|reviews|promos|portfolio)');
    }

    const allowedCategories = ['avatars', 'orders', 'reviews', 'promos', 'portfolio'];
    if (!allowedCategories.includes(category)) {
      throw new BadRequestException(`Invalid category. Allowed: ${allowedCategories.join(', ')}`);
    }

    // Обрабатываем изображение
    try {
      const filename = await this.filesService.processImage(file, category);
      const url = this.filesService.getFileUrl(category, filename);

      console.log('📁 Upload success:', { url, filename, category });

      return {
        success: true,
        data: {
          url,
          filename,
          category,
        },
      };
    } catch (err: any) {
      console.error('📁 Upload failed:', err?.message || err);
      throw new BadRequestException(err?.message || 'Failed to upload image');
    }
  }

  @Delete(':category/:filename')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('category') category: string,
    @Param('filename') filename: string,
  ) {
    await this.filesService.deleteFile(category, filename);
    return {
      success: true,
      message: 'File deleted successfully',
    };
  }
}

