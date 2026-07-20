import { Context, ContextKey } from '@libs/context';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Request } from 'express';
import { TokenService } from '@libs/jwt/jwt.service';
import { Admin } from '@modules/admin/domain/admin.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly context: Context,
    private readonly jwtTokenService: TokenService,
    @InjectDataSource() private readonly datasource: DataSource
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);

    try {
      const { adminId } = this.jwtTokenService.verifyAdminAccessToken(token);

      const admin = await this.datasource.getRepository(Admin).findOne({ where: { id: adminId } });

      if (!admin) {
        throw new UnauthorizedException('존재하지 않는 관리자입니다', {
          description: '인증 정보가 올바르지 않습니다.',
        });
      }

      this.context.set(ContextKey.ADMIN, admin);
    } catch (err) {
      throw new UnauthorizedException(err);
    }

    return true;
  }

  private extractToken(req: Request) {
    const [type, token] = (req.get('authorization') || '').split(' ');

    if (type?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('인증 정보가 올바르지 않습니다.', {
        description: '인증 정보가 올바르지 않습니다.',
      });
    }

    return token;
  }
}
