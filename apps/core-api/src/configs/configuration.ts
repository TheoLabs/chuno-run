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

interface AppConfig {
  mysql: DataSourceOptions;
  jwt: JwtConfig;
  kafka: KafkaConfig;
  redis: RedisOptions;
  google: GoogleConfig;
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
});
