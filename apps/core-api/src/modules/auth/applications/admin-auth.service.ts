import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { TokenService } from '@libs/jwt';
import { AdminRepository } from '@modules/admin/infrastructure/admin.repository';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GoogleService } from '@libs/google';

@Injectable()
export class AdminAuthService extends DddService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly tokenService: TokenService,
    private readonly googleService: GoogleService
  ) {
    super();
  }

  @Transactional()
  async googleLogin({ idToken }: { idToken: string }) {
    const { sub, email, name } = await this.googleService.verifyIdToken(idToken);

    const [admin] = await this.adminRepository.find({ email });

    if (!admin) {
      throw new UnauthorizedException('등록되지 않은 계정입니다.', {
        description: '등록되지 않은 계정입니다.',
      });
    }

    admin.signInWithGoogle({ sub, name });

    await this.adminRepository.save([admin]);

    return { accessToken: this.tokenService.signAdminAccessToken({ adminId: admin.id }) };
  }
}
