import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsInt, ValidateNested } from 'class-validator';

class ConsentItem {
  @IsInt()
  agreementId: number;

  @IsBoolean()
  isAgreed: boolean;
}

/** 약관 개정 재동의 저장. 온보딩과 달리 닉네임 없이 동의 이력만 갱신한다. */
export class GeneralUserConsentDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ConsentItem)
  consents: ConsentItem[];
}
