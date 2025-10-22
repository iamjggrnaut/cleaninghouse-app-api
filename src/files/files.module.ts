import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { JwtModule } from '@nestjs/jwt';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    MulterModule.register({
      storage: require('multer').memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        // Разрешаем только изображения
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed'), false);
        }
        cb(null, true);
      },
    }),
  ],
  providers: [FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}

