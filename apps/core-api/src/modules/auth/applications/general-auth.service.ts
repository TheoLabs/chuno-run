import { ConfigsService } from '@configs';
import { User, UserProvider, UserStatus } from '@modules/user/domain/user.entity';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { TokenService } from '@libs/jwt';
import { EntityManager } from 'typeorm';

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

export interface AuthResult {
  accessToken: string;
  user: {
    id: number;
    provider: UserProvider;
    providerUserId: string;
    status: UserStatus;
  };
}

/**
 * 로컬 개발용 임시 인증 서비스.
 *
 * 소셜 로그인(카카오/구글/애플)을 로컬에 붙이기 어려운 동안, provider+providerUserId만으로
 * User를 찾거나 생성하고 액세스 토큰을 발급해 프론트/앱 개발을 진행할 수 있게 한다.
 * 운영 환경에서는 절대 노출되면 안 되므로 production에서는 차단한다.
 */
@Injectable()
export class GeneralAuthService {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly tokenService: TokenService,
    private readonly configsService: ConfigsService
  ) {}

  /** 임시 로그인: 계정을 찾거나(providerKey) 없으면 생성하고 액세스 토큰을 발급한다. */
  async devLogin(input: DevLoginInput): Promise<AuthResult> {
    this.assertNotProduction();

    const provider = this.resolveProvider(input.provider);
    const providerUserId = input.providerUserId?.trim() || `dev-${provider}`;

    const userRepository = this.entityManager.getRepository(User);

    let user = await userRepository.findOne({ where: { provider, providerUserId } });

    if (!user) {
      // 첫 로그인 → onboarding 상태로 계정 생성. 닉네임 설정·active 전이는 온보딩(POST /auth/dev/onboarding)에서 처리.
      user = await userRepository.save(User.create({ provider, providerUserId }));
    }

    return this.toResult(user);
  }

  /**
   * 온보딩 완료: 닉네임을 설정하고 status를 onboarding→active로 전이한다.
   * dev 환경에서도 온보딩을 실제로 수행할 수 있게 하는 임시 경로다.
   * (실제 온보딩의 필수 약관 동의(UserConsent) 기록은 온보딩 기능 구현 시 추가한다.)
   */
  async completeOnboarding(userId: number, input: CompleteOnboardingInput): Promise<AuthResult> {
    this.assertNotProduction();

    const nickname = input.nickname?.trim();
    if (!nickname) {
      throw new BadRequestException('닉네임을 입력해 주세요.');
    }

    const userRepository = this.entityManager.getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`userId=${userId} 사용자를 찾을 수 없습니다.`);
    }

    if (user.status !== UserStatus.ONBOARDING) {
      throw new BadRequestException('이미 온보딩을 완료한 사용자입니다.');
    }

    user.nickname = nickname;
    user.status = UserStatus.ACTIVE;

    const saved = await userRepository.save(user);

    return this.toResult(saved);
  }

  /** 이미 존재하는 userId로 액세스 토큰만 재발급한다. (로컬 디버깅용) */
  async issueTokenByUserId(userId: number): Promise<AuthResult> {
    this.assertNotProduction();

    const user = await this.entityManager.getRepository(User).findOne({ where: { id: userId } });

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
      },
    };
  }
}
