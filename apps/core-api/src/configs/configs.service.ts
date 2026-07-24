import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type DataSourceOptions } from 'typeorm';
import {
  FirebaseConfig,
  GoogleConfig,
  JobConfig,
  JwtConfig,
  KafkaConfig,
  OauthConfig,
  RevalidationConfig,
} from './configuration';
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

  /** 앱 소셜 로그인(카카오/구글/애플) 검증 설정. */
  get oauth() {
    return this.configService.get<OauthConfig>('oauth')!;
  }

  /** FCM 푸시 발송 설정. */
  get firebase() {
    return this.configService.get<FirebaseConfig>('firebase')!;
  }

  /** 서버 정합성 재검증 임계값. */
  get revalidation() {
    return this.configService.get<RevalidationConfig>('revalidation')!;
  }

  get job() {
    return this.configService.get<JobConfig>('job')!;
  }
}
