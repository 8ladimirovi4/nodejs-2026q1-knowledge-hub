import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'auth',
            ttl: Number(config.get<string>('AUTH_THROTTLE_TTL_MS')) || 60_000,
            limit: Number(config.get<string>('AUTH_THROTTLE_LIMIT')) || 10,
          },
          {
            name: 'ai',
            ttl: 60_000,
            limit: Math.max(
              1,
              Number(config.get<string>('AI_RATE_LIMIT_RPM')) || 20,
            ),
          },
        ],
      }),
    }),
    PrismaModule,
    UserModule,
    ArticleModule,
    CategoryModule,
    CommentModule,
    AuthModule,
    AiModule,
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
    ThrottlerGuard,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(HttpContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
