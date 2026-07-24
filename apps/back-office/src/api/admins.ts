// 관리자 계정 API (/admins) 접근 계층.

import { apiRequest } from "./client";
import { toQuery } from "./users";
import type { AdminAccountStatus } from "../types/domain";

/** 관리자 계정 한 줄 — GET /admins 의 items[]. */
export interface AdminAccountItem {
  id: number;
  email: string;
  name: string | null;
  status: AdminAccountStatus;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse<T> {
  items: T[];
  total: number;
}

export function listAdmins(
  params: { page?: number; limit?: number; statuses?: AdminAccountStatus[] } = {},
  signal?: AbortSignal,
): Promise<ListResponse<AdminAccountItem>> {
  return apiRequest<ListResponse<AdminAccountItem>>(`/admins${toQuery(params)}`, { signal });
}

/**
 * 관리자 사전 등록(allowlist). 등록된 이메일로 구글 로그인하면 바로 들어올 수 있다.
 * 이미 등록된 이메일이면 서버가 400을 돌려준다.
 */
export async function createAdmin(email: string, name?: string): Promise<void> {
  // 이름은 선택 — 비우면 첫 구글 로그인 때 구글 계정 이름으로 채워진다.
  await apiRequest<Record<string, never>>("/admins", {
    method: "POST",
    body: name?.trim() ? { email, name: name.trim() } : { email },
  });
}

/**
 * 계정 비활성화. 자기 자신이거나 마지막 활성 관리자면 서버가 400으로 막는다
 * (아무도 못 들어오는 상태를 만들지 않기 위해서다).
 */
export async function disableAdmin(id: number): Promise<void> {
  await apiRequest<Record<string, never>>(`/admins/${id}/disabled`, { method: "PUT" });
}

export async function activateAdmin(id: number): Promise<void> {
  await apiRequest<Record<string, never>>(`/admins/${id}/active`, { method: "PUT" });
}
