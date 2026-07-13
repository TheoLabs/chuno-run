import { IsNotEmpty, IsString } from 'class-validator';

export class GeneralUserChangeNickname {
  @IsString()
  @IsNotEmpty()
  nickname: string;
}
