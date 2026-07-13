import { Exclude, Expose } from 'class-transformer';
import { ResponseDto } from '@libs/utils';
import { AgreementStatus, AgreementType } from '@modules/agreement/domain/agreement.entity';
import { CalendarDate } from '@types';

@Exclude()
abstract class BaseAgreementResponseDto extends ResponseDto {
  @Expose()
  id: number;

  @Expose()
  type: AgreementType;

  @Expose()
  version: string;

  @Expose()
  required: boolean;

  @Expose()
  status: AgreementStatus;

  @Expose()
  title: string;

  @Expose()
  content: string;

  @Expose()
  expectedActivatedOn: CalendarDate;
}

@Exclude()
export class GeneralAgreementResponseDto extends BaseAgreementResponseDto {}
