import type { DataSourceOptions } from 'typeorm';

export interface JwtConfig {
  accessTokenExpired: string;
  accessTokenSecret: string;
}

interface AppConfig {
  mysql: DataSourceOptions;
  jwt: JwtConfig;
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
});
