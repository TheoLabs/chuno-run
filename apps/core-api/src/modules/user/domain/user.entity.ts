import { today } from '@libs/date';
import { DddAggregate } from '@libs/ddd';
import { UserConsent } from '@modules/user/domain/user-consent.entity';
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
  nickname: string;
  profileImageUrl: string;
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

  @Column({ comment: '표시 이름' })
  nickname: string;

  @Column({ comment: '프로필 이미지 URL' })
  profileImageUrl: string;

  @Column({ comment: '가입 시각 (YYYY-MM-DD HH:mm:ss)' })
  joinOn: CalendarDate;

  @OneToMany(() => UserConsent, (userConsent) => userConsent.user, { cascade: true })
  userConsents: UserConsent[];

  private constructor(args: Ctor) {
    super();

    if (args) {
      this.provider = args.provider;
      this.providerUserId = args.providerUserId;
      this.nickname = args.nickname;
      this.profileImageUrl = args.profileImageUrl;
      this.joinOn = today('YYYY-MM-DD HH:mm:ss');
      this.userConsents = [];
      this.status = UserStatus.ONBOARDING;
    }
  }

  static create(args: Ctor) {
    return new User(args);
  }
}
