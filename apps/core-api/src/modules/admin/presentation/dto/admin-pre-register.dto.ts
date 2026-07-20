import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AdminPreRegisterDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
