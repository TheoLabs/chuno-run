import { ToArray } from '@libs/decorators';
import { PaginationDto } from '@libs/utils';
import { ROOM_SEARCH_COLUMNS } from '@modules/room/infrastructure/room.repository';
import { RoomStatus } from '@modules/room/domain/room.entity';
import { IsEnum, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

abstract class BaseRoomQueryDto extends PaginationDto {}

export class GeneralRoomQueryDto extends BaseRoomQueryDto {
  @ToArray()
  @IsEnum(RoomStatus, { each: true })
  @IsOptional()
  statuses?: RoomStatus[];

  @IsInt()
  @IsOptional()
  minGoalDistanceMeter?: number;

  @IsInt()
  @IsOptional()
  maxGoalDistanceMeter?: number;

  @IsInt()
  @IsOptional()
  minGoalLimitMinutes?: number;

  @IsInt()
  @IsOptional()
  maxGoalLimitMinutes?: number;
}

/**
 * 관리자 방 목록 조회. 일반 사용자 DTO와 달리 **모든 상태**를 필터로 열어두고
 * 제목·id 키워드 검색을 지원한다.
 */
export class AdminRoomQueryDto extends BaseRoomQueryDto {
  @ToArray()
  @IsEnum(RoomStatus, { each: true })
  @IsOptional()
  statuses?: RoomStatus[];

  @ToArray()
  @IsIn(Object.keys(ROOM_SEARCH_COLUMNS), { each: true })
  @IsOptional()
  searchKeys?: string[];

  @IsString()
  @IsOptional()
  searchValue?: string;
}
