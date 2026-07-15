import type { DataSourceOptions } from 'typeorm';

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

interface AppConfig {
  mysql: DataSourceOptions;
  jwt: JwtConfig;
  kafka: KafkaConfig;
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
});
