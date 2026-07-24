import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdminPreRegisterDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /** 표시 이름(선택). 비워두면 첫 구글 로그인 때 구글 계정 이름으로 채워진다. */
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
