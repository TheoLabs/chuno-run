import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { TokenService } from '@libs/jwt';
import { AdminRepository } from '@modules/admin/infrastructure/admin.repository';
import { AdminStatus } from '@modules/admin/domain/admin.entity';
import { Injectable, UnauthorizedException } from '@nestjs/common';

export interface AdminGoogleLoginInput {
  /** 구글이 검증해 돌려준 이메일 (필수). 로컬에서는 이 값으로 allowlist 조회한다. */
  email: string;
  /** 구글 프로필 이름 (선택). 최초 로그인 시 name 이 비어 있으면 채운다. */
  name?: string;
  /** 구글 계정 고유 id (선택). 최초 로그인 시 googleSub 로 바인딩한다. */
  sub?: string;
}

export interface AdminAuthResult {
  accessToken: string;
  admin: {
    id: number;
    email: string;
    name: string | null;
    status: AdminStatus;
  };
}

/**
 * 관리자 인증 서비스.
 *
 * 아직 실제 구글 OAuth(클라이언트 ID/시크릿·브라우저 리다이렉트) 연동은 없다.
 * 로컬에서는 "구글이 이 이메일을 검증해줬다"를 흉내낸 요청({ email, name?, sub? })을 받아
 * allowlist(사전 등록된 ACTIVE 관리자) 여부만 확인하고 관리자 액세스 토큰을 발급한다.
 */
@Injectable()
export class AdminAuthService extends DddService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly tokenService: TokenService
  ) {
    super();
  }

  /**
   * 로컬 mock 구글 로그인.
   * email 로 관리자를 조회 → 없으면 401(미등록) → 도메인 규칙(비활성 403, 신원 바인딩) 적용 후
   * 관리자 액세스 토큰을 발급한다.
   */
  @Transactional()
  async googleLogin(input: AdminGoogleLoginInput): Promise<AdminAuthResult> {
    const [admin] = await this.adminRepository.find({ email: input.email });

    if (!admin) {
      throw new UnauthorizedException('등록되지 않은 계정입니다.', {
        description: '등록되지 않은 계정입니다.',
      });
    }

    // 비활성 계정 거부 + 최초 로그인 시 googleSub/name 바인딩 (도메인 규칙).
    admin.signInWithGoogle({ sub: input.sub, name: input.name });

    await this.adminRepository.save([admin]);

    return {
      accessToken: this.tokenService.signAdminAccessToken({ adminId: admin.id }),
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        status: admin.status,
      },
    };
  }
}
