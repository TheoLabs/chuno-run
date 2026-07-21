import { AgreementType } from '@modules/agreement/domain/agreement.entity';
import { CalendarDate } from '@types';
import { IsBoolean, IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';

export class AdminAgreementCreateDto {
  @IsEnum(AgreementType)
  type: AgreementType;

  @IsBoolean()
  required: boolean;

  @Matches(/^\d+(\.\d+)*$/, { message: '버전은 숫자와 점(.)으로만 구성해야 합니다. 예: 1.0, 1.2.3' })
  @IsString()
  @IsNotEmpty()
  version: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  expectedActivatedOn: CalendarDate;
}
