import { ToArray } from '@libs/decorators';
import { PaginationDto } from '@libs/utils';
import { UserStatus } from '@modules/user/domain/user.entity';
import { USER_SEARCH_COLUMNS } from '@modules/user/infrastructure/user.repository';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

abstract class BaseUserQueryDto extends PaginationDto {}

/**
 * 관리자 사용자 목록 조회. 상태 필터와 닉네임·id·제공자 식별자 검색은
 * **관리자 표면에만** 열어둔다(일반 사용자 DTO에는 없다).
 */
export class AdminUserQueryDto extends BaseUserQueryDto {
  @ToArray()
  @IsEnum(UserStatus, { each: true })
  @IsOptional()
  statuses?: UserStatus[];

  @ToArray()
  @IsIn(Object.keys(USER_SEARCH_COLUMNS), { each: true })
  @IsOptional()
  searchKeys?: string[];

  @IsString()
  @IsOptional()
  searchValue?: string;
}
