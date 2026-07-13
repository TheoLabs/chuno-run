import { today } from '@libs/date';
import { DddAggregate } from '@libs/ddd';
import { UserConsent } from '@modules/user/domain/user-consent.entity';
import { BadRequestException } from '@nestjs/common';
import { CalendarDate } from '@types';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum UserProvider {
  KAKAO = 'kakao',
  GOOGLE = 'google',
  APPLE = 'apple',
}

export enum UserStatus {
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  EXITED = 'exited',
  SUSPENDED = 'suspended',
}

type Ctor = {
  provider: UserProvider;
  providerUserId: string;
};

@Entity()
@Unique('unique_provider_provider_user_id', ['provider', 'providerUserId'])
export class User extends DddAggregate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: UserProvider, comment: '소셜 로그인 제공자' })
  provider: UserProvider;

  @Column({ comment: '제공자가 부여한 사용자 식별자' })
  providerUserId: string;

  @Column({ type: 'enum', enum: UserStatus })
  status: UserStatus;

  @Column({ type: 'varchar', comment: '표시 이름', nullable: true })
  nickname: string | null;

  @Column({ type: 'varchar', comment: '프로필 이미지 URL', nullable: true })
  profileImageUrl: string | null;

  @Column({ comment: '가입 시각 (YYYY-MM-DD HH:mm:ss)' })
  joinOn: CalendarDate;

  @OneToMany(() => UserConsent, (userConsent) => userConsent.user, { cascade: true })
  userConsents: UserConsent[];

  private constructor(args: Ctor) {
    super();

    if (args) {
      this.provider = args.provider;
      this.providerUserId = args.providerUserId;
      this.joinOn = today('YYYY-MM-DD HH:mm:ss');
      this.userConsents = [];
      this.status = UserStatus.ONBOARDING;
    }
  }

  static create(args: Ctor) {
    return new User(args);
  }

  validOnboarded() {
    if (this.status !== UserStatus.ONBOARDING) {
      throw new BadRequestException('이미 온보딩이 완료된 계정입니다.', {
        description: '이미 온보딩이 완료된 계정입니다.',
      });
    }
  }

  onboard(nickname: string, consents: { agreementId: number; isAgreed: boolean }[]) {
    this.nickname = nickname;
    this.status = UserStatus.ACTIVE;
    this.userConsents = consents.map((consent) =>
      UserConsent.create({ agreementId: consent.agreementId, isAgreed: consent.isAgreed })
    );
  }

  update(args: { nickname?: string }) {
    const changed = this.stripUnchanged(args);

    if (!changed) {
      return;
    }

    Object.assign(this, changed);
  }
}
