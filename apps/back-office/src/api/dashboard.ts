// 관리자 대시보드 API (/admins/dashboard) 접근 계층.

import { apiRequest } from "./client";
import type { RoomStatus } from "../types/domain";

/** 대시보드 '최근 경주' 한 줄. */
export interface DashboardRecentRoom {
  id: number;
  title: string;
  status: RoomStatus;
  hostNickname: string | null;
  goalDistanceMeter: number;
  startOn: string;
  participantCount: number;
}

/** GET /admins/dashboard 응답. */
export interface DashboardSummary {
  serverTime: string;

  totalUserCount: number;
  activeUserCount: number;
  suspendedUserCount: number;
  onboardingUserCount: number;

  /** 아직 끝나지 않은 방 수(recruiting + ready + live). */
  activeRoomCount: number;
  roomCountByStatus: Record<RoomStatus, number>;

  todayRaceCount: number;

  /** 최근 N일 완주율(%). */
  completionRate: number;
  completionWindowDays: number;

  recentRooms: DashboardRecentRoom[];
}

export function getDashboard(signal?: AbortSignal): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>("/admins/dashboard", { signal });
}
