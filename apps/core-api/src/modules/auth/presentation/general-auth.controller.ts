import { Context, ContextKey } from '@libs/context';
import { UserGuard } from '@guards';
import { User } from '@modules/user/domain/user.entity';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CompleteOnboardingInput, DevLoginInput, GeneralAuthService } from '../applications/general-auth.service';

@Controller('auth')
export class GeneralAuthController {
  constructor(
    private readonly generalAuthService: GeneralAuthService,
    private readonly context: Context
  ) {}

  /**
   * [로컬 개발 전용] 임시 로그인.
   * 소셜 인증 없이 provider+providerUserId로 계정을 찾거나 만들고 액세스 토큰을 발급한다.
   *
   * @example POST /auth/dev/login { "provider": "kakao", "providerUserId": "me", "activate": true }
   */
  @Post('dev/login')
  async devLogin(@Body() body: DevLoginInput) {
    const data = await this.generalAuthService.devLogin(body ?? {});
    return { data };
  }

  /** [로컬 개발 전용] 기존 userId로 액세스 토큰만 재발급한다. */
  @Post('dev/token')
  async issueToken(@Body() body: { userId: number }) {
    const data = await this.generalAuthService.issueTokenByUserId(body.userId);
    return { data };
  }

  /**
   * 온보딩 완료 — 닉네임 설정 + status onboarding→active.
   * 로그인(dev/login)으로 받은 토큰이 필요하다.
   */
  @Post('dev/onboarding')
  @UseGuards(UserGuard)
  async completeOnboarding(@Body() body: CompleteOnboardingInput) {
    // 1. Destructure body, params, query
    const { nickname } = body;
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);
    // 3. Get result
    const data = await this.generalAuthService.completeOnboarding(user.id, { nickname });
    // 4. Send response
    return { data };
  }

  /** 현재 액세스 토큰의 사용자 정보를 반환한다. (토큰 검증용) */
  @Get('me')
  @UseGuards(UserGuard)
  me() {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    // 4. Send response
    return {
      data: {
        id: user.id,
        status: user.status,
        nickname: user.nickname,
        profileImageUrl: user.profileImageUrl,
      },
    };
  }
}
