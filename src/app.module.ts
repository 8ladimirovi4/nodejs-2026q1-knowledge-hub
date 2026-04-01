import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageModule } from './storage/storage.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [StorageModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
