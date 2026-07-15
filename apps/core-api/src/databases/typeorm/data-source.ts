import { config } from 'dotenv';

// TypeORM CLI 는 Nest DI 를 못 쓰므로 여기서 직접 env 를 로드한다.
config({ path: `.env.${process.env.NODE_ENV ?? 'local'}` });

import { DataSource } from 'typeorm';
import configuration from '../../configs/configuration';
import entities from './entities';

const { mysql } = configuration(process.env);

/**
 * TypeORM CLI(migration:generate/run/revert) 전용 DataSource.
 * 앱 런타임 연결은 typeorm.module.ts 의 forRootAsync 가 담당한다(별개).
 * CLI 에서는 절대 synchronize 하지 않는다.
 */
export default new DataSource({
  ...mysql,
  entities,
  migrations: ['src/databases/migrations/*.ts'],
  synchronize: false,
});
