import { CalendarDate } from '@types';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AdminAgreementUpdateDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  expectedActivatedOn?: CalendarDate;

  @IsBoolean()
  @IsOptional()
  required?: boolean;
}
