import { ResponseDto } from '@libs/utils';
import { ParticipantStatus } from '@modules/room/domain/participant.entity';
import { RoomStatus } from '@modules/room/domain/room.entity';
import { CalendarDate } from '@types';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
class RaceResultParticipantDto {
  @Expose()
  participantId: number;

  @Expose()
  userId: number;

  @Expose()
  nickname: string;

  @Expose()
  profileImageUrl: string | null;

  @Expose()
  status: ParticipantStatus;

  @Expose()
  finalRank: number | null;

  /** 누적 달린 거리(m). */
  @Expose()
  distanceMeter: number;

  /** 목표 도달(또는 종료) 시각. 미완주로 끝나면 경주 종료 시각이 들어간다. */
  @Expose()
  finishedOn: CalendarDate | null;

  /** 부정행위 탐지로 기록이 무효(실격) 처리됐는지. 결과 화면에서 일반 미완주와 구분해 표시한다(2차). */
  @Expose()
  voided: boolean;

  /** 출발부터 도달까지 걸린 시간(초). 아직 기록이 없으면 null. */
  @Expose()
  elapsedSeconds: number | null;

  /** 평균 페이스(초/km). 거리가 0이면 null. */
  @Expose()
  paceSecondsPerKm: number | null;

  /** 요청한 사용자 본인인지. 결과 화면의 '내 기록' 강조에 쓴다. */
  @Expose()
  isMe: boolean;
}

/** 경주 결과 — 최종 순위와 참가자별 개인 기록. */
@Exclude()
export class GeneralRaceResultResponseDto extends ResponseDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  status: RoomStatus;

  @Expose()
  goalDistanceMeter: number;

  @Expose()
  goalLimitMinutes: number;

  @Expose()
  startOn: CalendarDate;

  @Expose()
  endsOn: CalendarDate;

  @Expose()
  finishedOn: CalendarDate | null;

  /** 최종 순위 오름차순(동률은 거리 내림차순) 정렬된 참가자. */
  @Expose()
  @Type(() => RaceResultParticipantDto)
  participants: RaceResultParticipantDto[];
}

/** 경주 이력 한 줄 — 내가 참여했던 지난 경주의 결과 요약. */
@Exclude()
export class GeneralRaceHistoryResponseDto extends ResponseDto {
  @Expose()
  id: number;

  @Expose()
  title: string;

  @Expose()
  status: RoomStatus;

  @Expose()
  goalDistanceMeter: number;

  @Expose()
  goalLimitMinutes: number;

  @Expose()
  startOn: CalendarDate;

  @Expose()
  finishedOn: CalendarDate | null;

  @Expose()
  participantCount: number;

  /** 내 최종 등수. 아직 확정 전이면 null. */
  @Expose()
  myFinalRank: number | null;

  @Expose()
  myStatus: ParticipantStatus;

  /** 내 기록이 부정행위로 무효(실격) 처리됐는지. 이력에서 무효 경주를 구분 표시한다(2차). */
  @Expose()
  myVoided: boolean;

  @Expose()
  myDistanceMeter: number;

  @Expose()
  myElapsedSeconds: number | null;

  @Expose()
  myPaceSecondsPerKm: number | null;
}
