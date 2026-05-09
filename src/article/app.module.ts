import { Module } from '@nestjs/common';
import { ArticleController } from './app.controller';
import { ArticleService } from './app.service';
import { RagModule } from 'src/rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [ArticleController],
  providers: [ArticleService],
  exports: [ArticleService],
})
export class ArticleModule {}
