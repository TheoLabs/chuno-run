import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

class ConsentItem {
  @IsInt()
  agreementId: number;

  @IsBoolean()
  isAgreed: boolean;
}

export class GeneralUserOnboardingDto {
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsentItem)
  consents: ConsentItem[];
}
