import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 로컬 mock 구글 로그인 요청 DTO.
 * 실제 OAuth 콜백에서 구글이 검증해 돌려줄 신원(이메일/이름/sub)을 로컬에서 이 요청이 대신한다.
 */
export class AdminGoogleLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sub?: string;
}
