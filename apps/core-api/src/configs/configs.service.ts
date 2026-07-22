import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type DataSourceOptions } from 'typeorm';
import { GoogleConfig, JobConfig, JwtConfig, KafkaConfig } from './configuration';
import type { RedisOptions } from 'ioredis';

@Injectable()
export class ConfigsService {
  constructor(private readonly configService: ConfigService) {}

  isLocal() {
    return process.env.NODE_ENV === 'local';
  }

  isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  get mysql() {
    return this.configService.get<DataSourceOptions>('mysql')!;
  }

  get jwt() {
    return this.configService.get<JwtConfig>('jwt')!;
  }

  get kafka() {
    return this.configService.get<KafkaConfig>('kafka')!;
  }

  get redis() {
    return this.configService.get<RedisOptions>('redis')!;
  }

  get google() {
    return this.configService.get<GoogleConfig>('google')!;
  }

  get job() {
    return this.configService.get<JobConfig>('job')!;
  }
}
