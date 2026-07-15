import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type DataSourceOptions } from 'typeorm';
import { JwtConfig, KafkaConfig } from './configuration';

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
}
