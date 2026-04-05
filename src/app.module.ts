import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpContextMiddleware } from './common/middleware/http-context.middleware';
import { UserModule } from './user/user.module';
import { ArticleModule } from './article/article.module';

@Module({
  imports: [UserModule, ArticleModule],
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
