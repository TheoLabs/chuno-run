import { RoomStatus } from '@modules/room/domain/room.entity';
import { CalendarDate } from '@types';

/** 대시보드 최근 경주 한 줄. */
export interface AdminDashboardRecentRoom {
  id: number;
  title: string;
  status: RoomStatus;
  hostNickname: string | null;
  goalDistanceMeter: number;
  startOn: CalendarDate;
  participantCount: number;
}

/**
 * 대시보드 지표 묶음. 엔티티가 아니라 집계 결과라 `toInstance` 대상이 아니고,
 * 서비스가 만든 평범한 객체를 그대로 `{ data }` 로 내보낸다.
 */
export interface AdminDashboardResponseDto {
  /** 집계 기준 서버 시각. */
  serverTime: CalendarDate;

  totalUserCount: number;
  activeUserCount: number;
  suspendedUserCount: number;
  onboardingUserCount: number;

  /** 아직 끝나지 않은 방 수(recruiting + ready + live). */
  activeRoomCount: number;
  roomCountByStatus: Record<RoomStatus, number>;

  /** 오늘 시작 예정이거나 시작했던 경주 수. */
  todayRaceCount: number;

  /** 최근 N일 완주율(%) — 끝난 경주의 완주 참가자 / 전체 참가자. */
  completionRate: number;
  completionWindowDays: number;

  recentRooms: AdminDashboardRecentRoom[];
}
