import type { AdminRoom, RoomParticipant, RoomResult } from "./types";

export const mockRooms: AdminRoom[] = [
  {
    id: 318,
    title: "아침 3km 대결",
    hostNickname: "러너킴",
    hostId: 1042,
    status: "live",
    capacity: 6,
    joined: 4,
    startAt: "2026-07-16 07:00",
    targetDistanceKm: 3.0,
    limitMinutes: 30,
    finishPace: "10'00\"/km",
  },
  {
    id: 319,
    title: "주말 10km",
    hostNickname: "스피드박",
    hostId: 1043,
    status: "recruiting",
    capacity: 8,
    joined: 2,
    startAt: "2026-07-17 08:00",
    targetDistanceKm: 10.0,
    limitMinutes: 90,
    finishPace: "9'00\"/km",
  },
  {
    id: 317,
    title: "퇴근런 5km",
    hostNickname: "김페이스",
    hostId: 1045,
    status: "finished",
    capacity: 6,
    joined: 6,
    startAt: "2026-07-15 19:00",
    targetDistanceKm: 5.0,
    limitMinutes: 45,
    finishPace: "9'00\"/km",
  },
  {
    id: 316,
    title: "새벽 인터벌 러닝",
    hostNickname: "느긋최",
    hostId: 1046,
    status: "cancelled",
    capacity: 4,
    joined: 1,
    startAt: "2026-07-14 06:00",
    targetDistanceKm: 4.0,
    limitMinutes: 40,
    finishPace: "10'00\"/km",
  },
  {
    id: 315,
    title: "한강 야간 러닝",
    hostNickname: "러너킴",
    hostId: 1042,
    status: "ready",
    capacity: 10,
    joined: 7,
    startAt: "2026-07-18 21:00",
    targetDistanceKm: 8.0,
    limitMinutes: 80,
    finishPace: "10'00\"/km",
  },
];

// 방 상세 — 참가자 (진행/모집 중 방)
export const mockParticipants: RoomParticipant[] = [
  { rank: "1", nickname: "러너킴", status: "running", currentDistance: "1.8km", finishedAt: "-" },
  { rank: "2", nickname: "스피드박", status: "running", currentDistance: "1.5km", finishedAt: "-" },
  { rank: "3", nickname: "김페이스", status: "running", currentDistance: "1.1km", finishedAt: "-" },
  { rank: "-", nickname: "느긋최", status: "dnf", currentDistance: "0.4km", finishedAt: "-" },
];

// 방 상세 — 경주 결과 (종료 방에서만 표시)
export const mockResults: RoomResult[] = [
  { rank: "1", nickname: "김페이스", record: "24'10\"", pace: "4'50\"/km", distance: "5.0km" },
  { rank: "2", nickname: "러너킴", record: "25'30\"", pace: "5'06\"/km", distance: "5.0km" },
  { rank: "3", nickname: "스피드박", record: "27'02\"", pace: "5'24\"/km", distance: "5.0km" },
  { rank: "dnf", nickname: "느긋최", record: "-", pace: "-", distance: "3.8km" },
];

export function getRoomById(id: number): AdminRoom | undefined {
  return mockRooms.find((r) => r.id === id);
}
