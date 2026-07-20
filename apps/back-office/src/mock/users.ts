import type { AdminUser, UserParticipation } from "./types";

export const mockUsers: AdminUser[] = [
  {
    id: 1042,
    nickname: "러너킴",
    provider: "kakao",
    status: "active",
    joinedAt: "2026-06-01 10:22",
    lastSeenAt: "2026-07-16 07:01",
  },
  {
    id: 1043,
    nickname: "스피드박",
    provider: "google",
    status: "suspended",
    joinedAt: "2026-06-03 14:05",
    lastSeenAt: "2026-07-14 21:30",
  },
  {
    id: 1044,
    nickname: null,
    provider: "apple",
    status: "onboarding",
    joinedAt: "2026-06-05 09:12",
    lastSeenAt: "2026-06-05 09:20",
  },
  {
    id: 1045,
    nickname: "김페이스",
    provider: "kakao",
    status: "active",
    joinedAt: "2026-06-08 18:44",
    lastSeenAt: "2026-07-15 19:40",
  },
  {
    id: 1046,
    nickname: "느긋최",
    provider: "google",
    status: "exited",
    joinedAt: "2026-06-11 11:00",
    lastSeenAt: "2026-07-01 08:15",
  },
];

// 사용자 상세 — 경주 참가 이력 (닉네임별 시드)
export const mockParticipationsByUser: Record<number, UserParticipation[]> = {
  1042: [
    { roomTitle: "퇴근런 5km", status: "finished", rank: "2위", distance: "5.0km" },
    { roomTitle: "주말 10km", status: "dnf", rank: "-", distance: "7.3km" },
    { roomTitle: "아침 3km 대결", status: "running", rank: "-", distance: "1.2km" },
  ],
};

export function getUserById(id: number): AdminUser | undefined {
  return mockUsers.find((u) => u.id === id);
}

export function getParticipations(id: number): UserParticipation[] {
  return mockParticipationsByUser[id] ?? mockParticipationsByUser[1042];
}
