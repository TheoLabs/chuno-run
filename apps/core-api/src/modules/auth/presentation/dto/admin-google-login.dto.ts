import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 관리자 구글 로그인 요청 DTO.
 * 프론트가 구글 로그인으로 받은 ID token 을 그대로 전달하면, 서버가 구글로 검증한다.
 */
export class AdminGoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
