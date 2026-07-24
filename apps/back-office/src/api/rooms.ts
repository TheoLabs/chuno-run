// 관리자 방(경주) API (/admins/rooms) 접근 계층.

import { apiRequest } from "./client";
import { toQuery } from "./users";
import type { ParticipantStatus, RoomStatus } from "../types/domain";

/** 목록 한 줄 — GET /admins/rooms 의 items[]. */
export interface AdminRoomItem {
  id: number;
  hostUserId: number;
  hostNickname: string | null;
  title: string;
  goalDistanceMeter: number;
  goalLimitMinutes: number;
  startOn: string;
  /** 제한 시간이 만료되는 시각(startOn + goalLimitMinutes). */
  endsOn: string;
  capacity: number;
  status: RoomStatus;
  finishedOn: string | null;
  currentParticipantCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 상세의 참가자 한 줄. */
export interface AdminRoomParticipant {
  id: number;
  userId: number;
  nickname: string | null;
  status: ParticipantStatus;
  currentDistanceMeter: number;
  finalRank: number | null;
  joinOn: string;
  finishedOn: string | null;
  /** 출발부터 도달(또는 종료)까지 걸린 시간(초). 기록이 없으면 null. */
  elapsedSeconds: number | null;
  /** 평균 페이스(초/km). */
  paceSecondsPerKm: number | null;
}

export interface AdminRoomDetail extends AdminRoomItem {
  participants: AdminRoomParticipant[];
}

export interface AdminRoomListParams {
  page?: number;
  limit?: number;
  statuses?: RoomStatus[];
  /** 검색 대상 필드. 서버 allowlist: title · id. */
  searchKeys?: string[];
  searchValue?: string;
  sort?: string;
  order?: "ASC" | "DESC";
}

interface ListResponse<T> {
  items: T[];
  total: number;
}

export function listRooms(
  params: AdminRoomListParams = {},
  signal?: AbortSignal,
): Promise<ListResponse<AdminRoomItem>> {
  return apiRequest<ListResponse<AdminRoomItem>>(`/admins/rooms${toQuery(params)}`, { signal });
}

export function getRoom(id: number, signal?: AbortSignal): Promise<AdminRoomDetail> {
  return apiRequest<AdminRoomDetail>(`/admins/rooms/${id}`, { signal });
}

/**
 * 방 강제 취소 — 아직 끝나지 않은 방을 cancelled 로 돌린다.
 * 진행 중이던 경주라면 달리던 참가자는 미완주(dnf)로 정리된다.
 */
export async function cancelRoom(id: number): Promise<void> {
  await apiRequest<{ id: number }>(`/admins/rooms/${id}/cancel`, { method: "POST" });
}
