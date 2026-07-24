import { UserProvider } from '@modules/user/domain/user.entity';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

/**
 * 소셜 로그인 요청. `token` 은 앱이 제공자 SDK 로 받은 값이다.
 * - kakao: 액세스 토큰
 * - google: ID 토큰
 * - apple: identity 토큰
 */
export class GeneralSocialLoginDto {
  @IsEnum(UserProvider)
  provider: UserProvider;

  @IsString()
  @IsNotEmpty()
  token: string;
}
