import { DddAggregate } from '@libs/ddd';
import { ForbiddenException } from '@nestjs/common';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AdminStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

type Ctor = {
  email: string;
};

@Entity()
export class Admin extends DddAggregate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: '구글 계정 이메일' })
  email: string;

  @Column({ type: 'varchar', unique: true, nullable: true, comment: '구글 계정 고유 id' })
  googleSub: string | null;

  @Column({ type: 'varchar', nullable: true, comment: '이름' })
  name: string | null;

  @Column({ type: 'enum', enum: AdminStatus })
  status: AdminStatus;

  private constructor(args: Ctor) {
    super();

    if (args) {
      this.email = args.email;
      // 사전 등록(allowlist)된 관리자는 추가 즉시 로그인 가능하도록 ACTIVE 로 둔다.
      this.status = AdminStatus.ACTIVE;
    }
  }

  static of(args: Ctor) {
    return new Admin(args);
  }

  /**
   * 로컬 mock 구글 로그인의 도메인 규칙.
   * - 비활성(DISABLED) 계정은 로그인 거부(403).
   * - 최초 로그인 시 구글 신원(googleSub)을 바인딩한다. sub 가 오면 그 값, 없으면 email 기반 결정적 값.
   * - name 이 비어 있고 요청에 name 이 오면 채운다.
   */
  signInWithGoogle(identity: { sub?: string; name?: string }) {
    if (this.status === AdminStatus.DISABLED) {
      throw new ForbiddenException('비활성화된 관리자 계정입니다.', {
        description: '비활성화된 관리자 계정입니다.',
      });
    }

    if (!this.googleSub) {
      this.googleSub = identity.sub?.trim() || `google_${this.email}`;
    }

    if (!this.name && identity.name?.trim()) {
      this.name = identity.name.trim();
    }
  }
}
