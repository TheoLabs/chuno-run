import { ToArray } from '@libs/decorators';
import { PaginationDto } from '@libs/utils';
import { AdminStatus } from '@modules/admin/domain/admin.entity';
import { IsEnum, IsOptional } from 'class-validator';

abstract class BaseAdminQueryDto extends PaginationDto {}

export class AdminQueryDto extends BaseAdminQueryDto {
  @ToArray()
  @IsEnum(AdminStatus, { each: true })
  @IsOptional()
  statuses?: AdminStatus[];
}
