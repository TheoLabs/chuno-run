import { UserGuard } from '@guards';
import { Context, ContextKey } from '@libs/context';
import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { GeneralUserChangeNickname, GeneralUserConsentDto, GeneralUserOnboardingDto } from './dto';
import { GeneralUserService } from '../applications/general-user.service';

@Controller('users')
@UseGuards(UserGuard)
export class GeneralUserController {
  constructor(
    private readonly generalUserService: GeneralUserService,
    private readonly context: Context
  ) {}

  @Put('/me')
  async changeNickname(@Body() body: GeneralUserChangeNickname) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    await this.generalUserService.update({ ...body, user });

    // 4. Send response
    return { data: {} };
  }

  @Post('me/onboarding')
  async onboard(@Body() body: GeneralUserOnboardingDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    await this.generalUserService.onboard({ ...body, user });
    // 4. Send response

    return { data: {} };
  }

  /**
   * 재동의가 필요한 약관 목록 — 시행 중인 약관 중 아직 동의하지 않은 것.
   * hasRequired 가 true 면 필수 약관 개정분이 남아 있어 서비스 진입 전에 재동의를 받아야 한다.
   */
  @Get('me/consents/pending')
  async listPendingConsents() {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalUserService.listPendingConsents({ user });

    // 4. Send response
    return { data };
  }

  /** 약관 재동의 저장. */
  @Post('me/consents')
  async consent(@Body() body: GeneralUserConsentDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    await this.generalUserService.consent({ ...body, user });

    // 4. Send response
    return { data: {} };
  }

  /** [2차] 계정 탈퇴 — status=exited 전이, 진행 중 참가 정리, 기기 해지. 이후 앱은 로그아웃한다. */
  @Post('me/withdrawal')
  async withdraw() {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    await this.generalUserService.withdraw({ user });

    // 4. Send response
    return { data: {} };
  }

  @Get('me/stats')
  async getStats() {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalUserService.getStats({ user });

    // 4. Send response
    return { data };
  }
}
