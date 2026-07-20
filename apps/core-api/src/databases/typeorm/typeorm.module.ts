import { Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule as NestTypeOrmModule } from '@nestjs/typeorm';
import { ConfigsService } from '@configs';
import entities from './entities';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    NestTypeOrmModule.forRootAsync({
      inject: [ConfigsService],
      useFactory: (configsService: ConfigsService) => ({
        ...configsService.mysql,
        entities,
        // NOTE: 스키마 변경은 마이그레이션으로만. (data-source.ts + pnpm migration:*)
        synchronize: true,
        logging: false,
        charset: 'utf8mb4',
        timezone: 'Z',
      }),
    }),
  ],
})
export class TypeOrmModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TypeOrmModule.name);

  constructor(private readonly datasource: DataSource) {}

  onModuleInit() {
    if (this.datasource.isInitialized) {
      this.logger.log('Database connection is ready.');
    }
  }

  async onModuleDestroy() {
    this.logger.log('Database connection is closing.');
    await this.datasource.destroy();
  }
}
