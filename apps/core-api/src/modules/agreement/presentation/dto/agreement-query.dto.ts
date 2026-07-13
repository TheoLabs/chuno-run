import { ToArray } from '@libs/decorators';
import { PaginationDto } from '@libs/utils';
import { AgreementType } from '@modules/agreement/domain/agreement.entity';
import { IsEnum, IsOptional } from 'class-validator';

abstract class BaseAgreementQueryDto extends PaginationDto {
  @ToArray()
  @IsEnum(AgreementType, { each: true })
  @IsOptional()
  types?: AgreementType[];
}

export class GeneralAgreementQueryDto extends BaseAgreementQueryDto {}
