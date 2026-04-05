import { Module } from '@nestjs/common';
import { StorageModule } from 'src/storage';
import { ArticleController } from './app.controller';
import { ArticleService } from './app.service';

@Module({
  imports: [StorageModule],
  controllers: [ArticleController],
  providers: [ArticleService],
  exports: [ArticleService],
})
export class ArticleModule {}
