import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DomainModule } from '@modules/domain.module';
import { ContextModule } from '@libs/context';
import { ContextMiddleware, UUIDMiddleware } from '@middlewares';
import { DatabasesModule } from '@databases';
import { ConfigsModule } from '@configs';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { RequestLoggerInterceptor } from '@libs/interceptors';
import { JwtTokenModule } from '@libs/jwt';
import { ExceptionFilter } from '@libs/filters';
import { EventStoreModule } from '@libs/event-store';

@Module({
  imports: [ContextModule, DatabasesModule, ConfigsModule, JwtTokenModule, DomainModule, EventStoreModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware, UUIDMiddleware).forRoutes('*');
  }
}
