import { ConfigsService } from '@configs';
import { UserProvider } from '@modules/user/domain/user.entity';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '@libs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { createPublicKey, type JsonWebKey } from 'crypto';

/** 제공자 검증 결과 — 계정 매칭에 필요한 최소 정보만 뽑는다. */
export interface OauthIdentity {
  provider: UserProvider;
  /** 제공자가 부여한 고유 사용자 식별자. User.providerUserId 로 저장된다. */
  providerUserId: string;
  nickname?: string;
  profileImageUrl?: string;
}

interface AppleJwk extends JsonWebKey {
  kid: string;
  alg: string;
}

const KAKAO_USER_ME_URL = 'https://kapi.kakao.com/v2/user/me';
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

/**
 * 소셜 제공자 토큰 검증기.
 *
 * 앱이 카카오/구글/애플 SDK로 받은 토큰을 서버에 넘기면, 여기서 **제공자에게 직접 확인**해
 * 위조를 걸러내고 고유 식별자를 얻는다. 클라이언트가 주장하는 사용자 id 는 절대 신뢰하지 않는다.
 */
@Injectable()
export class OauthVerifierService {
  private readonly logger = new Logger(OauthVerifierService.name);
  private readonly googleClient = new OAuth2Client();

  /** 애플 공개키 캐시 — 매 로그인마다 JWKS 를 받아오지 않도록. */
  private appleJwks?: { keys: AppleJwk[]; fetchedAt: number };

  /** 애플 공개키 캐시 수명 (24시간). */
  private static readonly APPLE_JWKS_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly configsService: ConfigsService,
    private readonly tokenService: TokenService
  ) {}

  async verify({ provider, token }: { provider: UserProvider; token: string }): Promise<OauthIdentity> {
    switch (provider) {
      case UserProvider.KAKAO:
        return this.verifyKakao(token);
      case UserProvider.GOOGLE:
        return this.verifyGoogle(token);
      case UserProvider.APPLE:
        return this.verifyApple(token);
      default:
        throw new UnauthorizedException('지원하지 않는 소셜 제공자입니다.', {
          description: '지원하지 않는 소셜 제공자입니다.',
        });
    }
  }

  /**
   * 카카오 — 앱이 받은 **액세스 토큰**으로 사용자 정보를 조회한다.
   * 토큰이 유효하지 않거나 다른 앱에서 발급된 것이면 카카오가 401 을 돌려준다.
   */
  private async verifyKakao(accessToken: string): Promise<OauthIdentity> {
    const response = await fetch(KAKAO_USER_ME_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch((error) => {
      this.logger.error(`카카오 사용자 조회 실패: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });

    if (!response?.ok) {
      throw new UnauthorizedException('카카오 로그인 검증에 실패했습니다.', {
        description: '카카오 로그인 검증에 실패했습니다.',
      });
    }

    const payload = (await response.json()) as {
      id?: number | string;
      kakao_account?: { profile?: { nickname?: string; profile_image_url?: string } };
    };

    if (payload.id === undefined || payload.id === null) {
      throw new UnauthorizedException('카카오 사용자 식별자를 확인할 수 없습니다.');
    }

    return {
      provider: UserProvider.KAKAO,
      providerUserId: String(payload.id),
      nickname: payload.kakao_account?.profile?.nickname,
      profileImageUrl: payload.kakao_account?.profile?.profile_image_url,
    };
  }

  /**
   * 구글 — 앱이 받은 **ID 토큰**의 서명과 audience(클라이언트 ID)를 검증한다.
   * iOS/Android 클라이언트 ID 가 서로 달라 허용 목록으로 받는다.
   */
  private async verifyGoogle(idToken: string): Promise<OauthIdentity> {
    const audience = this.configsService.oauth.googleClientIds;

    if (audience.length === 0) {
      throw new UnauthorizedException('구글 로그인이 설정되지 않았습니다. (GOOGLE_APP_CLIENT_IDS)');
    }

    const ticket = await this.googleClient.verifyIdToken({ idToken, audience }).catch((error) => {
      this.logger.warn(`구글 ID 토큰 검증 실패: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });

    const payload = ticket?.getPayload();

    if (!payload?.sub) {
      throw new UnauthorizedException('구글 로그인 검증에 실패했습니다.', {
        description: '구글 로그인 검증에 실패했습니다.',
      });
    }

    return {
      provider: UserProvider.GOOGLE,
      providerUserId: payload.sub,
      nickname: payload.name,
      profileImageUrl: payload.picture,
    };
  }

  /**
   * 애플 — Sign in with Apple 의 **identity token(JWT)** 을 애플 공개키(JWKS)로 검증한다.
   * 발급자·audience(번들 id)·만료를 함께 확인한다.
   */
  private async verifyApple(identityToken: string): Promise<OauthIdentity> {
    const audience = this.configsService.oauth.appleClientIds;

    if (audience.length === 0) {
      throw new UnauthorizedException('애플 로그인이 설정되지 않았습니다. (APPLE_CLIENT_IDS)');
    }

    const kid = this.decodeJwtHeader(identityToken).kid;
    const jwk = (await this.getAppleKeys()).find((key) => key.kid === kid);

    if (!jwk) {
      throw new UnauthorizedException('애플 로그인 검증에 실패했습니다. (알 수 없는 서명 키)');
    }

    // Node 의 crypto 로 JWK → SPKI PEM 을 만들어 별도 라이브러리 없이 RS256 서명을 검증한다.
    const publicKey = createPublicKey({ key: jwk, format: 'jwk' }).export({ type: 'spki', format: 'pem' }).toString();

    const payload = this.tokenService.verifyExternalToken<{ sub?: string; email?: string }>(identityToken, {
      publicKey,
      issuer: APPLE_ISSUER,
      audience,
    });

    if (!payload.sub) {
      throw new UnauthorizedException('애플 사용자 식별자를 확인할 수 없습니다.');
    }

    return { provider: UserProvider.APPLE, providerUserId: payload.sub };
  }

  private decodeJwtHeader(token: string): { kid?: string } {
    const [encodedHeader] = token.split('.');

    if (!encodedHeader) {
      throw new UnauthorizedException('애플 로그인 토큰 형식이 올바르지 않습니다.');
    }

    try {
      return JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as { kid?: string };
    } catch {
      throw new UnauthorizedException('애플 로그인 토큰 형식이 올바르지 않습니다.');
    }
  }

  private async getAppleKeys(): Promise<AppleJwk[]> {
    const cached = this.appleJwks;

    if (cached && Date.now() - cached.fetchedAt < OauthVerifierService.APPLE_JWKS_TTL_MS) {
      return cached.keys;
    }

    const response = await fetch(APPLE_JWKS_URL).catch(() => null);

    if (!response?.ok) {
      // 캐시가 있으면 만료됐더라도 그걸 쓰는 편이 로그인 전면 실패보다 낫다.
      if (cached) {
        return cached.keys;
      }

      throw new UnauthorizedException('애플 공개키를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }

    const { keys } = (await response.json()) as { keys: AppleJwk[] };
    this.appleJwks = { keys, fetchedAt: Date.now() };

    return keys;
  }
}
