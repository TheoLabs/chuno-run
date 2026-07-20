import type { RoomStatus } from "./types";

export interface Kpi {
  label: string;
  value: string;
}

export const mockKpis: Kpi[] = [
  { label: "누적 가입자", value: "1,284" },
  { label: "활성 방 (모집·진행)", value: "37" },
  { label: "오늘 경주", value: "12" },
  { label: "완주율 (7일)", value: "92%" },
];

export interface RecentRace {
  title: string;
  status: RoomStatus;
  joined: number;
  startAt: string;
}

export const mockRecentRaces: RecentRace[] = [
  { title: "아침 3km 대결", status: "live", joined: 4, startAt: "07-16 07:00" },
  { title: "퇴근런 5km", status: "finished", joined: 6, startAt: "07-15 19:00" },
  { title: "주말 10km", status: "recruiting", joined: 2, startAt: "07-17 08:00" },
];

export const mockRoomStatusCounts: Record<RoomStatus, number> = {
  recruiting: 20,
  ready: 5,
  live: 12,
  finished: 143,
  cancelled: 8,
};
