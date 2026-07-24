import { ResponseDto } from '@libs/utils';
import { CheatAction, CheatType } from '@modules/room/domain/cheat-detection.entity';
import { CalendarDate } from '@types';
import { Exclude, Expose } from 'class-transformer';

/** 관리자 탐지 이력 한 줄 — 참가자를 타고 사용자·방 표시 정보를 함께 준다. */
@Exclude()
export class AdminCheatDetectionResponseDto extends ResponseDto {
  @Expose()
  id: number;

  @Expose()
  type: CheatType;

  @Expose()
  action: CheatAction;

  @Expose()
  reportedDistanceMeter: number;

  @Expose()
  acceptedDistanceMeter: number;

  @Expose()
  observedSpeedMps: number | null;

  @Expose()
  thresholdSpeedMps: number | null;

  @Expose()
  intervalSeconds: number | null;

  @Expose()
  detail: string | null;

  @Expose()
  detectedOn: CalendarDate;

  // 참가자 조인으로 채운 표시 정보 (사용자 상세 이동·검색에 쓴다)
  @Expose()
  userId: number | null;

  @Expose()
  nickname: string | null;

  @Expose()
  roomId: number | null;

  @Expose()
  roomTitle: string | null;
}
