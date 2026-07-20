import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { logger } from '@libs/logger';
import { requesterValidatorPipe } from '@libs/pipes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger });
  const port = process.env.PORT ?? 3000;

  app.enableShutdownHooks();
  app.useGlobalPipes(requesterValidatorPipe);

  // 로컬 백오피스(:8000/:8001)·대시보드(:5173) 등 다른 오리진에서의 호출 허용.
  // 배포 환경은 CORS_ORIGINS(쉼표 구분)로 오버라이드.
  app.enableCors({
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:8000', 'http://localhost:8001', 'http://localhost:5173'],
    credentials: true,
  });

  await app.listen(port);

  logger.log(`core-api listening on http://localhost:${port}.`);
}

bootstrap();
