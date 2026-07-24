import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigsService } from '@configs';

export interface AccessTokenPayload {
  userId: number;
}

export interface AdminAccessTokenPayload {
  adminId: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configsService: ConfigsService
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configsService.jwt.accessTokenSecret,
      expiresIn: this.configsService.jwt.accessTokenExpired as JwtSignOptions['expiresIn'],
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwtService.verify<AccessTokenPayload>(token, {
      secret: this.configsService.jwt.accessTokenSecret,
    });
  }

  signAdminAccessToken(payload: AdminAccessTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configsService.jwt.accessTokenSecret,
      expiresIn: this.configsService.jwt.accessTokenExpired as JwtSignOptions['expiresIn'],
    });
  }

  verifyAdminAccessToken(token: string): AdminAccessTokenPayload {
    return this.jwtService.verify<AdminAccessTokenPayload>(token, {
      secret: this.configsService.jwt.accessTokenSecret,
    });
  }

  /**
   * 외부 제공자(예: Sign in with Apple)가 RS256 으로 서명한 JWT 를 그 제공자의 공개키로 검증한다.
   * 우리 서비스의 액세스 토큰과 달리 대칭키 시크릿이 아니라 PEM 공개키를 쓴다.
   *
   * @param publicKey SPKI PEM 형식 공개키
   */
  verifyExternalToken<T extends object>(
    token: string,
    { publicKey, issuer, audience }: { publicKey: string; issuer: string; audience: string[] }
  ): T {
    return this.jwtService.verify<T>(token, {
      publicKey,
      algorithms: ['RS256'],
      issuer,
      audience: audience as [string, ...string[]],
    });
  }
}
