import { config } from 'dotenv';

// TypeORM CLI 와 동일하게 Nest DI 없이 직접 env 를 로드한다.
config({ path: `.env.${process.env.NODE_ENV ?? 'local'}` });

import dataSource from '../typeorm/data-source';
import { Admin, AdminStatus } from '@modules/admin/domain/admin.entity';

/**
 * [로컬 전용] 초기 ACTIVE 관리자 시드.
 *
 * preRegister(POST /admins)는 AdminGuard 로 보호되므로 최초 관리자는 로그인할 수 없다(닭-달걀).
 * 이 스크립트로 allowlist 에 초기 관리자 1명을 넣어 로컬에서 바로 로그인해볼 수 있게 한다.
 *
 * 실행: `pnpm --filter @chuno/core-api seed:admin`
 * 이메일: 환경변수 INITIAL_ADMIN_EMAIL (기본값 admin@chuno.run)
 */
async function seedAdmin() {
  const email = (process.env.INITIAL_ADMIN_EMAIL ?? 'admin@chuno.run').trim();

  await dataSource.initialize();

  try {
    const repository = dataSource.getRepository(Admin);
    const existing = await repository.findOne({ where: { email } });

    if (existing) {
      console.log(`[seed:admin] 이미 존재하는 관리자입니다. (email=${email}, status=${existing.status})`);
      return;
    }

    const admin = Admin.of({ email }); // status=ACTIVE 로 생성됨
    await repository.save(admin);

    console.log(`[seed:admin] 초기 관리자를 생성했습니다. (email=${email}, status=${AdminStatus.ACTIVE})`);
  } finally {
    await dataSource.destroy();
  }
}

seedAdmin().catch((err) => {
  console.error('[seed:admin] 시드 실패:', err);
  process.exit(1);
});
