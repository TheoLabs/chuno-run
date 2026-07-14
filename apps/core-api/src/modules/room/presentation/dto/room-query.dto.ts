import { ToArray } from '@libs/decorators';
import { PaginationDto } from '@libs/utils';
import { RoomStatus } from '@modules/room/domain/room.entity';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

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
