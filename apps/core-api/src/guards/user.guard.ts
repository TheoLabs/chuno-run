import { Context, ContextKey } from '@libs/context';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Request } from 'express';
import { TokenService } from '@libs/jwt/jwt.service';
import { User } from '@modules/user/domain/user.entity';

@Injectable()
export class UserGuard implements CanActivate {
  constructor(
    private readonly context: Context,
    private readonly jwtTokenService: TokenService,
    @InjectDataSource() private readonly datasource: DataSource
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);

    try {
      const { userId } = this.jwtTokenService.verifyAccessToken(token);

      const user = await this.datasource.getRepository(User).findOne({ where: { id: userId } });

      if (!user) {
        throw new UnauthorizedException('존재하지 않는 사용자입니다', {
          description: '인증 정보가 올바르지 않습니다.',
        });
      }

      this.context.set(ContextKey.USER, user);
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
