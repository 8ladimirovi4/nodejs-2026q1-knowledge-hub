import { Module } from '@nestjs/common';
import { CategoryController } from './app.controller';
import { CategoryService } from './app.service';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
