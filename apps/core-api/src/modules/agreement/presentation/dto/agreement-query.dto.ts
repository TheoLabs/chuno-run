import { ToArray } from '@libs/decorators';
import { PaginationDto } from '@libs/utils';
import { AgreementStatus, AgreementType } from '@modules/agreement/domain/agreement.entity';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

abstract class BaseAgreementQueryDto extends PaginationDto {
  @ToArray()
  @IsEnum(AgreementType, { each: true })
  @IsOptional()
  types?: AgreementType[];
}

export class GeneralAgreementQueryDto extends BaseAgreementQueryDto {}

export class AdminAgreementQueryDto extends BaseAgreementQueryDto {
  @ToArray()
  @IsEnum(AgreementStatus, { each: true })
  @IsOptional()
  statuses?: AgreementStatus[];

  @ToArray('boolean')
  @IsBoolean({ each: true })
  @IsOptional()
  required?: boolean[];
}
