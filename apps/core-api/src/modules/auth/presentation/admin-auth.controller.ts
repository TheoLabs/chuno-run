import { AdminGuard } from '@guards';
import { Context, ContextKey } from '@libs/context';
import { Admin } from '@modules/admin/domain/admin.entity';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminAuthService } from '../applications/admin-auth.service';
import { AdminGoogleLoginDto, AdminMeDto } from './dto';

@Controller('admins/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly context: Context
  ) {}

  /**
   * 로컬 mock 구글 로그인.
   * 실제 OAuth 콜백 자리를 로컬에서 이 요청이 대신한다 — 구글이 검증해 돌려준 신원({ email, name?, sub? })을
   * 그대로 흉내낸다. 등록된 ACTIVE 관리자면 관리자 액세스 토큰을 발급한다.
   *
   * @example POST /admins/auth/google { "email": "admin@chuno.run", "name": "관리자", "sub": "1234" }
   */
  @Post('google')
  async googleLogin(@Body() body: AdminGoogleLoginDto) {
    // 1. Destructure body, params, query
    const { email, name, sub } = body;

    // 2. Get context
    // 3. Get result
    const data = await this.adminAuthService.googleLogin({ email, name, sub });

    // 4. Send response
    return { data };
  }

  /** 현재 액세스 토큰의 관리자 정보를 반환한다. (토큰 검증용) */
  @Get('me')
  @UseGuards(AdminGuard)
  me() {
    // 1. Destructure body, params, query
    // 2. Get context
    const admin = this.context.get<Admin>(ContextKey.ADMIN);

    // 3. Get result
    // 4. Send response
    return { data: admin.toInstance(AdminMeDto) };
  }

  // NOTE: 로그아웃은 클라이언트가 토큰을 폐기(삭제)하는 방식이므로 서버 엔드포인트는 두지 않는다.
}
