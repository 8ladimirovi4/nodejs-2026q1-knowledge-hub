import { Module } from '@nestjs/common';
import { StorageModule } from 'src/storage';
import { CategoryController } from './app.controller';
import { CategoryService } from './app.service';

@Module({
  imports: [StorageModule],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
