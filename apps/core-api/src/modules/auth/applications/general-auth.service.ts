import { ConfigsService } from '@configs';
import { User, UserProvider, UserStatus } from '@modules/user/domain/user.entity';
import { UserRepository } from '@modules/user/infrastructure/user.repository';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { today } from '@libs/date';
import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { TokenService } from '@libs/jwt';
import { OauthVerifierService } from './oauth-verifier.service';

export interface DevLoginInput {
  /** 소셜 제공자 (기본 kakao). 실제 소셜 인증 없이 식별자만 흉내낸다. */
  provider?: UserProvider;
  /** 제공자 사용자 식별자 (기본 `dev-<provider>`). 같은 값이면 같은 계정으로 재로그인된다. */
  providerUserId?: string;
}

export interface CompleteOnboardingInput {
  /** 온보딩에서 설정할 닉네임 (필수). */
  nickname: string;
}

export interface SocialLoginInput {
  /** 소셜 제공자. */
  provider: UserProvider;
  /** 앱이 제공자 SDK 로 받은 토큰. 카카오=액세스 토큰, 구글·애플=ID/identity 토큰. */
  token: string;
}

export interface AuthResult {
  accessToken: string;
  user: {
    id: number;
    provider: UserProvider;
    providerUserId: string;
    status: UserStatus;
    nickname: string | null;
  };
}

/**
 * 앱 사용자 인증 서비스.
 *
 * 정식 경로는 {@link GeneralAuthService.login} — 앱이 카카오/구글/애플 SDK 로 받은 토큰을
 * 서버가 제공자에게 직접 확인하고 계정을 매칭한다.
 *
 * 그 옆의 `dev*` 메서드는 제공자 앱 키가 없는 로컬에서 앱/프론트 개발을 이어가기 위한 임시 경로다.
 * provider+providerUserId 만으로 계정을 찾거나 만들며, 운영에서는 절대 노출되면 안 되므로
 * production 에서는 차단한다.
 */
@Injectable()
export class GeneralAuthService extends DddService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configsService: ConfigsService,
    private readonly oauthVerifierService: OauthVerifierService,
    private readonly userRepository: UserRepository
  ) {
    super();
  }

  /**
   * 소셜 로그인 — 앱이 받은 제공자 토큰을 **서버가 직접 검증**하고, provider + providerUserId 로
   * 계정을 찾거나(재로그인) 없으면 생성한다(첫 로그인 → status=onboarding).
   *
   * 온보딩을 중단했던 계정도 같은 providerKey 로 매칭되므로 중복 계정이 생기지 않고
   * 온보딩을 이어서 진행하게 된다. 진입 화면 분기는 응답의 `user.status` 로 한다.
   */
  @Transactional()
  async login({ provider, token }: SocialLoginInput): Promise<AuthResult> {
    const identity = await this.oauthVerifierService.verify({ provider, token });

    const [existing] = await this.userRepository.find({
      provider: identity.provider,
      providerUserId: identity.providerUserId,
    });

    if (existing) {
      // 정지 계정도 토큰은 내주고, 진입 분기(status)로 안내 화면을 띄운다.
      // 탈퇴(exited) 계정은 재로그인 복구 — 30일 유예 정책에 따라 active 로 되살린다.
      await this.reactivateIfExited(existing);
      return this.toResult(existing);
    }

    const user = User.create({ provider: identity.provider, providerUserId: identity.providerUserId });

    await this.userRepository.save([user]);

    return this.toResult(user);
  }

  /**
   * [2차] 탈퇴 계정 재로그인 복구. 유예(30일) 내면 active 로 되살린다.
   * 유예가 지난 계정은 개인정보 파기 대상이지만 파기 배치가 3차라 아직 데이터가 남아 있어, 동일하게 복구한다.
   */
  private async reactivateIfExited(user: User) {
    if (user.status !== UserStatus.EXITED) {
      return;
    }

    const now = today('YYYY-MM-DD HH:mm:ss');
    // 유예 만료 여부와 무관하게(파기 미구현) 복구한다. 유예 내면 reactivate 로, 만료면 강제 복구.
    if (user.isWithdrawalGraceExpired(now)) {
      user.forceReactivate();
    } else {
      user.reactivate(now);
    }

    await this.userRepository.save([user]);
  }

  /** 임시 로그인: 계정을 찾거나(providerKey) 없으면 생성하고 액세스 토큰을 발급한다. */
  @Transactional()
  async devLogin(input: DevLoginInput): Promise<AuthResult> {
    this.assertNotProduction();

    const provider = this.resolveProvider(input.provider);
    const providerUserId = input.providerUserId?.trim() || `dev-${provider}`;

    const [existing] = await this.userRepository.find({ provider, providerUserId });

    if (existing) {
      await this.reactivateIfExited(existing);
      return this.toResult(existing);
    }

    // 첫 로그인 → onboarding 상태로 계정 생성. 닉네임 설정·active 전이는 온보딩에서 처리.
    const user = User.create({ provider, providerUserId });

    await this.userRepository.save([user]);

    return this.toResult(user);
  }

  /**
   * 온보딩 완료: 닉네임을 설정하고 status를 onboarding→active로 전이한다.
   * dev 환경에서도 온보딩을 실제로 수행할 수 있게 하는 임시 경로다.
   * (실제 온보딩의 필수 약관 동의(UserConsent) 기록은 온보딩 기능 구현 시 추가한다.)
   */
  @Transactional()
  async completeOnboarding(userId: number, input: CompleteOnboardingInput): Promise<AuthResult> {
    this.assertNotProduction();

    const nickname = input.nickname?.trim();
    if (!nickname) {
      throw new BadRequestException('닉네임을 입력해 주세요.');
    }

    const [user] = await this.userRepository.find({ ids: [userId] });

    if (!user) {
      throw new NotFoundException(`userId=${userId} 사용자를 찾을 수 없습니다.`);
    }

    if (user.status !== UserStatus.ONBOARDING) {
      throw new BadRequestException('이미 온보딩을 완료한 사용자입니다.');
    }

    user.nickname = nickname;
    user.status = UserStatus.ACTIVE;

    await this.userRepository.save([user]);

    return this.toResult(user);
  }

  /** 이미 존재하는 userId로 액세스 토큰만 재발급한다. (로컬 디버깅용) */
  async issueTokenByUserId(userId: number): Promise<AuthResult> {
    this.assertNotProduction();

    const [user] = await this.userRepository.find({ ids: [userId] });

    if (!user) {
      throw new NotFoundException(`userId=${userId} 사용자를 찾을 수 없습니다.`);
    }

    return this.toResult(user);
  }

  private resolveProvider(provider?: UserProvider): UserProvider {
    if (provider === undefined) {
      return UserProvider.KAKAO;
    }

    if (!Object.values(UserProvider).includes(provider)) {
      throw new BadRequestException(`provider는 ${Object.values(UserProvider).join(' | ')} 중 하나여야 합니다.`);
    }

    return provider;
  }

  private assertNotProduction() {
    if (this.configsService.isProduction()) {
      throw new ForbiddenException('로컬 개발 환경에서만 사용할 수 있는 임시 API입니다.');
    }
  }

  private toResult(user: User): AuthResult {
    return {
      accessToken: this.tokenService.signAccessToken({ userId: user.id }),
      user: {
        id: user.id,
        provider: user.provider,
        providerUserId: user.providerUserId,
        status: user.status,
        nickname: user.nickname,
      },
    };
  }
}
