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

@Exclude()
class AdminParticipantDto {
  @Expose()
  id: number;

  @Expose()
  userId: number;

  @Expose()
  nickname: string | null;

  @Expose()
  status: ParticipantStatus;

  @Expose()
  currentDistanceMeter: number;

  @Expose()
  finalRank: number | null;

  @Expose()
  joinOn: CalendarDate;

  @Expose()
  finishedOn: CalendarDate | null;

  /** 출발부터 도달(또는 종료)까지 걸린 시간(초). 기록이 없으면 null. */
  @Expose()
  elapsedSeconds: number | null;

  /** 평균 페이스(초/km). 거리가 0이면 null. */
  @Expose()
  paceSecondsPerKm: number | null;
}

/** 관리자 방 목록 한 줄 — 운영 화면에 필요한 방장/인원/종료 예정 시각을 덧붙인다. */
@Exclude()
export class AdminRoomListResponseDto extends BaseRoomResponseDto {
  @Expose()
  hostNickname: string | null;

  @Expose()
  currentParticipantCount: number;

  /** 제한 시간이 만료되는 시각 (startOn + goalLimitMinutes). */
  @Expose()
  endsOn: CalendarDate;
}

/** 관리자 방 상세 — 참가자 진행 상황 포함. */
@Exclude()
export class AdminRoomRetrieveResponseDto extends AdminRoomListResponseDto {
  @Expose()
  @Type(() => AdminParticipantDto)
  participants: AdminParticipantDto[];
}
