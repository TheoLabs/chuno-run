// 백오피스 목(mock) 데이터 타입 정의.
// 실제 API 연동 전 UI/UX 검증용이며, core-api 응답 형태를 참고해 최소한으로 정의한다.

export type UserStatus = "active" | "suspended" | "onboarding" | "exited";
export type Provider = "kakao" | "google" | "apple";

export interface AdminUser {
  id: number;
  nickname: string | null;
  provider: Provider;
  status: UserStatus;
  joinedAt: string;
  lastSeenAt: string;
}

export type ParticipationStatus = "finished" | "dnf" | "running";

export interface UserParticipation {
  roomTitle: string;
  status: ParticipationStatus;
  rank: string;
  distance: string;
}

export type RoomStatus =
  | "recruiting"
  | "ready"
  | "live"
  | "finished"
  | "cancelled";

export interface AdminRoom {
  id: number;
  title: string;
  hostNickname: string;
  status: RoomStatus;
  capacity: number;
  joined: number;
  startAt: string;
  // 상세용 확장 필드
  hostId?: number;
  targetDistanceKm?: number;
  limitMinutes?: number;
  finishPace?: string;
}

export type ParticipantStatus = "running" | "finished" | "dnf";

export interface RoomParticipant {
  rank: string;
  nickname: string;
  status: ParticipantStatus;
  currentDistance: string;
  finishedAt: string;
}

export interface RoomResult {
  rank: string;
  nickname: string;
  record: string;
  pace: string;
  distance: string;
}

export type AgreementType = "service" | "privacy" | "location" | "marketing";
export type AgreementStatus = "active" | "archived" | "pending";

export interface Agreement {
  id: number;
  type: AgreementType;
  version: string;
  required: boolean;
  status: AgreementStatus;
  effectiveDate: string;
  body?: string;
  // API의 title 필드 보관용(현재 UI 미사용). 목록 실연동 시 매핑해 채운다.
  title?: string;
}

export type AdminAccountStatus = "active" | "disabled";

export interface AdminAccount {
  id: number;
  email: string;
  name: string;
  status: AdminAccountStatus;
  createdAt: string;
  self?: boolean;
}
