import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PasswordSanitizerInterceptor } from './common/interceptors/password-sanitizer.interceptor';
import { HttpContextMiddleware } from './common/middleware/http-context.middleware';
import { ArticleModule } from './article/app.module';
import { CategoryModule } from './category/app.module';
import { CommentModule } from './comment/app.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UserModule,
    ArticleModule,
    CategoryModule,
    CommentModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HttpContextMiddleware,
    {
      provide: APP_INTERCEPTOR,
      useClass: PasswordSanitizerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(HttpContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
