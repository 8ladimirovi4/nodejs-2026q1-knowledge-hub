import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpContextMiddleware } from './common/middleware/http-context.middleware';
import { ArticleModule } from './article/app.module';
import { CategoryModule } from './category/app.module';
import { CommentModule } from './comment/app.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    ArticleModule,
    CategoryModule,
    CommentModule,
  ],
  controllers: [AppController],
  providers: [AppService, HttpContextMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(HttpContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
