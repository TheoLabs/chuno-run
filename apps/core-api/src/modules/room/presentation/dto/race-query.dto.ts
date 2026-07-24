import { ToArray } from '@libs/decorators';
import { PaginationDto } from '@libs/utils';
import { RoomStatus } from '@modules/room/domain/room.entity';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

/** 내 경주 이력 조회. 기본값은 끝난 경주(finished·cancelled)만 본다. */
export class GeneralRaceHistoryQueryDto extends PaginationDto {
  @ToArray()
  @IsEnum(RoomStatus, { each: true })
  @IsOptional()
  statuses?: RoomStatus[];
}

/** 복귀 재동기화 — 기기가 보관한 누적 거리를 서버에 다시 올린다. */
export class GeneralRaceResyncDto {
  @IsInt()
  @Min(0)
  distanceMeter: number;
}
