import { ResponseDto } from '@libs/utils';
import { ParticipantStatus } from '@modules/room/domain/participant.entity';
import { RoomStatus } from '@modules/room/domain/room.entity';
import { CalendarDate } from '@types';
import { Exclude, Expose, Type } from 'class-transformer';

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
class UserDto {
  @Expose()
  id: number;

  @Expose()
  nickname: string;

  @Expose()
  profileImageUrl: string | null;
}

@Exclude()
class ParticipantDto extends ResponseDto {
  @Expose()
  id: number;

  @Expose()
  roomId: number;

  @Expose()
  status: ParticipantStatus;

  @Expose()
  currentDistanceMeter: number;

  @Expose()
  finishedOn: CalendarDate | null;

  @Expose()
  finalRank: number | null;

  @Expose()
  joinOn: CalendarDate;

  @Expose()
  @Type(() => UserDto)
  user: UserDto;
}

@Exclude()
export class GeneralRoomListResponseDto extends BaseRoomResponseDto {
  @Expose()
  isJoined: boolean;

  @Expose()
  currentParticipantCount: number;
}

@Exclude()
export class GeneralRoomRetrieveResponseDto extends BaseRoomResponseDto {
  @Expose()
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];
}
