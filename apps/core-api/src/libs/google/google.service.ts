import { ConfigsService } from '@configs';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleService {
  private readonly googleClient: OAuth2Client;

  constructor(private readonly configsService: ConfigsService) {
    this.googleClient = new OAuth2Client(this.configsService.google.clientId);
  }

  async verifyIdToken(idToken: string): Promise<{ sub: string; email: string; name: string }> {
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: this.configsService.google.clientId });

      const payload = ticket.getPayload();

      if (!payload?.email_verified || !payload.email) {
        throw new UnauthorizedException('유효하지 않은 구글 인증입니다.', {
          description: '유효하지 않은 구글 인증입니다.',
        });
      }

      return { sub: payload.sub, email: payload.email, name: payload.name || '' };
    } catch {
      throw new UnauthorizedException('유효하지 않은 구글 인증입니다.', {
        description: '유효하지 않은 구글 인증입니다.',
      });
    }
  }
}
