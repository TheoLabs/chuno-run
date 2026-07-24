import { addDays, today } from '@libs/date';
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

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '[2차] 탈퇴 요청 시각 — exitedOn+30일이 파기·복구 가능 기준',
  })
  exitedOn: CalendarDate | null;

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

  /**
   * 약관 개정 재동의 — 이미 이력이 있는 약관은 값을 갱신하고, 처음 보는 약관(새 버전 포함)은 이력을 추가한다.
   * 개정 버전은 새 Agreement(=다른 agreementId)라서 기존 동의 이력을 덮어쓰지 않고 별도로 쌓인다.
   *
   * 주의: `userConsents` 관계가 로드된 상태에서 호출해야 한다.
   */
  reconsent(consents: { agreementId: number; isAgreed: boolean }[]) {
    consents.forEach(({ agreementId, isAgreed }) => {
      const existing = this.userConsents.find((consent) => consent.agreementId === agreementId);

      if (existing) {
        existing.change(isAgreed);
        return;
      }

      this.userConsents.push(UserConsent.create({ agreementId, isAgreed }));
    });
  }

  /**
   * 이용 정지 — active → suspended. 온보딩을 마치지 않았거나 이미 탈퇴한 계정은 정지 대상이 아니다.
   * (정지를 유발하는 운영 조건 자체는 아직 미확정 — 1차는 전이만 모델링한다.)
   */
  suspend() {
    if (this.status === UserStatus.SUSPENDED) {
      return;
    }

    if (this.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('이용 중(active)인 계정만 정지할 수 있습니다.', {
        description: '이용 중(active)인 계정만 정지할 수 있습니다.',
      });
    }

    this.status = UserStatus.SUSPENDED;
  }

  /** 정지 해제 — suspended → active. */
  activate() {
    if (this.status === UserStatus.ACTIVE) {
      return;
    }

    if (this.status !== UserStatus.SUSPENDED) {
      throw new BadRequestException('정지된 계정만 해제할 수 있습니다.', {
        description: '정지된 계정만 해제할 수 있습니다.',
      });
    }

    this.status = UserStatus.ACTIVE;
  }

  /** [2차] 탈퇴 유예 기간(일). 이 기간 내 재로그인하면 복구된다. */
  static readonly WITHDRAWAL_GRACE_DAYS = 30;

  /**
   * [2차] 탈퇴 — active/suspended → exited. 요청 시각을 exitedOn에 남긴다.
   * 실제 개인정보 파기는 exitedOn+30일 이후 배치가 처리한다(3차 운영 자동화).
   */
  withdraw() {
    if (this.status === UserStatus.EXITED) {
      return;
    }

    if (this.status === UserStatus.ONBOARDING) {
      throw new BadRequestException('온보딩을 마친 계정만 탈퇴할 수 있습니다.', {
        description: '온보딩을 마친 계정만 탈퇴할 수 있습니다.',
      });
    }

    this.status = UserStatus.EXITED;
    this.exitedOn = today('YYYY-MM-DD HH:mm:ss');
  }

  /** [2차] 30일 유예가 지나 파기 대상인지. 재로그인 복구 허용 여부의 반대 조건. */
  isWithdrawalGraceExpired(now: CalendarDate): boolean {
    if (this.status !== UserStatus.EXITED || !this.exitedOn) {
      return false;
    }

    const deadline = addDays(this.exitedOn, User.WITHDRAWAL_GRACE_DAYS);
    return now >= deadline;
  }

  /**
   * [2차] 탈퇴 유예 내 재로그인 복구 — exited → active. exitedOn을 비운다.
   * 유예가 지났으면 복구할 수 없다(호출부가 재가입으로 안내).
   */
  reactivate(now: CalendarDate) {
    if (this.status !== UserStatus.EXITED) {
      return;
    }

    if (this.isWithdrawalGraceExpired(now)) {
      throw new BadRequestException('탈퇴 유예 기간이 지나 복구할 수 없습니다.', {
        description: '탈퇴 유예 기간이 지나 복구할 수 없습니다.',
      });
    }

    this.status = UserStatus.ACTIVE;
    this.exitedOn = null;
  }

  /**
   * [2차→3차 과도기] 유예 만료 여부와 무관하게 exited → active 복구.
   * 개인정보 파기 배치(3차)가 아직 없어 유예가 지나도 데이터가 남아 있으므로, 재로그인 시 복구를 허용한다.
   * 파기 배치가 생기면 이 경로는 제거하고 만료 계정은 재가입(신규 온보딩)으로 보낸다.
   */
  forceReactivate() {
    if (this.status !== UserStatus.EXITED) {
      return;
    }

    this.status = UserStatus.ACTIVE;
    this.exitedOn = null;
  }

  update(args: { nickname?: string }) {
    const changed = this.stripUnchanged(args);

    if (!changed) {
      return;
    }

    Object.assign(this, changed);
  }
}
