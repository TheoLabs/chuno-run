import type { DataSourceOptions } from 'typeorm';
import type { RedisOptions } from 'ioredis';

export interface JwtConfig {
  accessTokenExpired: string;
  accessTokenSecret: string;
}

export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  groupId: string;
  topic: string;
}

export interface GoogleConfig {
  clientId: string;
}

export interface JobConfig {
  // 외부 스케줄러(EventBridge 등)가 배치 잡을 호출할 때 x-scheduler-token 헤더로 제시하는 시크릿.
  schedulerToken: string;
}

interface AppConfig {
  mysql: DataSourceOptions;
  jwt: JwtConfig;
  kafka: KafkaConfig;
  redis: RedisOptions;
  google: GoogleConfig;
  job: JobConfig;
}

export default (env: Record<string, any> = process.env): AppConfig => ({
  mysql: {
    type: 'mysql',
    port: 3306,
    host: env.MYSQL_HOST,
    username: env.MYSQL_USERNAME,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
  },
  jwt: {
    accessTokenExpired: env.ACCESS_TOKEN_EXPIRED,
    accessTokenSecret: env.ACCESS_TOKEN_SECRET,
  },
  kafka: {
    clientId: env.KAFKA_CLIENT_ID,
    brokers: (env.KAFKA_BROKERS ?? '')
      .split(',')
      .map((broker: string) => broker.trim())
      .filter(Boolean),
    groupId: env.KAFKA_GROUP_ID,
    topic: env.KAFKA_DDD_EVENT_TOPIC,
  },
  redis: {
    host: env.REDIS_HOST,
    port: Number(env.REDIS_PORT),
  },
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
  },
  job: {
    schedulerToken: env.SCHEDULER_JOB_TOKEN,
  },
});
