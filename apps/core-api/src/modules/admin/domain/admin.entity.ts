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

  signInWithGoogle(identity: { sub?: string; name?: string }) {
    if (this.status === AdminStatus.DISABLED) {
      throw new ForbiddenException('비활성화된 관리자 계정입니다.', {
        description: '비활성화된 관리자 계정입니다.',
      });
    }

    if (!this.googleSub && identity.sub?.trim()) {
      this.googleSub = identity.sub.trim();
    }

    if (!this.name && identity.name?.trim()) {
      this.name = identity.name.trim();
    }
  }
}
