import { ResponseDto } from '@libs/utils';
import { RoomStatus } from '@modules/room/domain/room.entity';
import { CalendarDate } from '@types';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
abstract class BaseRoomResponseDto extends ResponseDto {
  @Expose()
  id: number;

  @Expose()
  hostUserId: number;

  @Expose()
  title: string;

  @Expose()
  goalDistanceMeter: number;

  @Expose()
  goalLimitMinutes: number;

  @Expose()
  startOn: CalendarDate;

  @Expose()
  capacity: number;

  @Expose()
  status: RoomStatus;

  @Expose()
  finishedOn: CalendarDate | null;
}

@Exclude()
export class GeneralRoomListResponseDto extends BaseRoomResponseDto {
  @Expose()
  currentParticipantCount: number;
}
