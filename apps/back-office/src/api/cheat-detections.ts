// 관리자 부정행위 탐지 이력 API (/admins/cheat-detections) 접근 계층.

import { apiRequest } from "./client";
import { toQuery } from "./users";

/** 탐지 유형 — core-api CheatType 과 동일. */
export type CheatType = "abnormalSpeed" | "spoofSuspected" | "timestampMismatch" | "impossibleFinish";

/** 자동 조치 — rejected(보고 반려) / voided(기록 무효). */
export type CheatAction = "rejected" | "voided";

/** 탐지 이력 한 줄 — 참가자를 타고 사용자·방 정보를 함께 준다. */
export interface CheatDetectionItem {
  id: number;
  type: CheatType;
  action: CheatAction;
  reportedDistanceMeter: number;
  acceptedDistanceMeter: number;
  observedSpeedMps: number | null;
  thresholdSpeedMps: number | null;
  intervalSeconds: number | null;
  detail: string | null;
  detectedOn: string;
  userId: number | null;
  nickname: string | null;
  roomId: number | null;
  roomTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheatDetectionListParams {
  page?: number;
  limit?: number;
  types?: CheatType[];
  /** 검색 대상 필드. 서버 allowlist: id · detail. */
  searchKeys?: string[];
  searchValue?: string;
}

interface ListResponse<T> {
  items: T[];
  total: number;
}

export function listCheatDetections(
  params: CheatDetectionListParams = {},
  signal?: AbortSignal,
): Promise<ListResponse<CheatDetectionItem>> {
  return apiRequest<ListResponse<CheatDetectionItem>>(`/admins/cheat-detections${toQuery(params)}`, { signal });
}

export function getCheatDetection(id: number, signal?: AbortSignal): Promise<CheatDetectionItem> {
  return apiRequest<CheatDetectionItem>(`/admins/cheat-detections/${id}`, { signal });
}
