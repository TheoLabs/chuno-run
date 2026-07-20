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
}
