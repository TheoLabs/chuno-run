// 관리자 사용자 API (/admins/users) 접근 계층.

import { apiRequest } from "./client";
import type { Provider, UserStatus } from "../types/domain";

/** 목록 한 줄 — GET /admins/users 의 items[]. */
export interface AdminUserItem {
  id: number;
  nickname: string | null;
  profileImageUrl: string | null;
  status: UserStatus;
  provider: Provider;
  /** 가입 시각 (YYYY-MM-DD HH:mm:ss). */
  joinOn: string;
  /** 참가한 경주 수. */
  raceCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 상세 — 목록 필드 + 참가 이력 요약. */
export interface AdminUserDetail extends AdminUserItem {
  providerUserId: string;
  finishedCount: number;
  winCount: number;
  totalRunningDistanceMeter: number;
  /** 완주율(%). */
  completedRate: number;
}

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  statuses?: UserStatus[];
  /** 검색 대상 필드. 서버 allowlist: nickname · id · providerUserId. */
  searchKeys?: string[];
  searchValue?: string;
}

interface ListResponse<T> {
  items: T[];
  total: number;
}

/** 값이 있는 파라미터만 쿼리스트링으로 만든다(배열은 콤마 구분 — 서버 규약). */
function toQuery(params: object): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, Array.isArray(value) ? value.join(",") : String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function listUsers(
  params: AdminUserListParams = {},
  signal?: AbortSignal,
): Promise<ListResponse<AdminUserItem>> {
  return apiRequest<ListResponse<AdminUserItem>>(`/admins/users${toQuery(params)}`, { signal });
}

export function getUser(id: number, signal?: AbortSignal): Promise<AdminUserDetail> {
  return apiRequest<AdminUserDetail>(`/admins/users/${id}`, { signal });
}

/** 이용 정지 (active → suspended). 이용 중이 아닌 계정이면 서버가 400을 돌려준다. */
export async function suspendUser(id: number): Promise<void> {
  await apiRequest<Record<string, never>>(`/admins/users/${id}/suspended`, { method: "PUT" });
}

/** 정지 해제 (suspended → active). */
export async function activateUser(id: number): Promise<void> {
  await apiRequest<Record<string, never>>(`/admins/users/${id}/active`, { method: "PUT" });
}

export { toQuery };
