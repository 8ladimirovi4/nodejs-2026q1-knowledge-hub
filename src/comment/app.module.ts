import { Module } from '@nestjs/common';
import { StorageModule } from 'src/storage';
import { CommentController } from './app.controller';
import { CommentService } from './app.service';

@Module({
  imports: [StorageModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
