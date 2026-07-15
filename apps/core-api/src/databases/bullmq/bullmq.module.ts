import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigsService } from '@configs';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigsService],
      useFactory: (configsService: ConfigsService) => ({
        connection: configsService.redis,
      }),
    }),
  ],
})
export class BullMqModule {}
