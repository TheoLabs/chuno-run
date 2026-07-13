import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { logger } from '@libs/logger';
import { requesterValidatorPipe } from '@libs/pipes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger });
  const port = process.env.PORT ?? 3000;

  app.enableShutdownHooks();
  app.useGlobalPipes(requesterValidatorPipe);

  await app.listen(port);

  logger.log(`core-api listening on http://localhost:${port}.`);
}

bootstrap();
