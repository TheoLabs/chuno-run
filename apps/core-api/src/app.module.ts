import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DomainModule } from '@modules/domain.module';
import { ContextModule } from '@libs/context';
import { ContextMiddleware, UUIDMiddleware } from '@middlewares';

@Module({
  imports: [ContextModule, DomainModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware, UUIDMiddleware).forRoutes('*');
  }
}
