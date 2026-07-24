// 관리자 약관 API (/admins/agreements) 접근 계층.
// 지금은 목록 조회(list)만 실연동한다. 등록/활성화/수정은 화면에서 로컬 state 로 처리.

import { apiRequest } from "./client";
import type { Agreement, AgreementStatus, AgreementType } from "../types/domain";

/**
 * 서버 응답의 약관 항목. (GET /admins/agreements → { items, total })
 * 백오피스 내부 모델(Agreement)과 필드명이 일부 다르므로 아래 매핑을 거친다.
 * - expectedActivatedOn → effectiveDate
 * - content → body
 */
export interface AgreementItem {
  id: number;
  type: AgreementType;
  version: string;
  required: boolean;
  status: AgreementStatus;
  title: string;
  content: string;
  /** 시행 예정일 (YYYY-MM-DD). */
  expectedActivatedOn: string;
  createdAt: string;
  updatedAt: string;
}

interface AgreementListResponse {
  items: AgreementItem[];
  total: number;
}

/** 서버 AgreementItem → 백오피스 Agreement 모델로 변환한다. */
function toAgreement(item: AgreementItem): Agreement {
  return {
    id: item.id,
    type: item.type,
    version: item.version,
    required: item.required,
    status: item.status,
    effectiveDate: item.expectedActivatedOn,
    body: item.content,
    title: item.title,
  };
}

/**
 * 약관 목록을 전체 조회한다. (필터 없이 전량 로드)
 * 현재 서버는 limit 미지정 시 페이지네이션 없이 전체를 반환하므로 파라미터 없이 호출한다.
 */
export async function listAgreements(signal?: AbortSignal): Promise<Agreement[]> {
  const { items } = await apiRequest<AgreementListResponse>("/admins/agreements", { signal });
  return items.map(toAgreement);
}

/**
 * 약관 1건을 상세 조회한다. (GET /admins/agreements/:id)
 * 없는 id면 서버가 404를 반환한다. 목록과 동일한 매핑을 재사용한다.
 */
export async function getAgreement(id: number, signal?: AbortSignal): Promise<Agreement> {
  const item = await apiRequest<AgreementItem>(`/admins/agreements/${id}`, { signal });
  return toAgreement(item);
}

/**
 * 약관을 부분 수정한다. (PUT /admins/agreements/:id — 멱등, 바뀐 필드만 전송)
 * 서버는 대기중(pending) 약관만 수정을 허용하며, 위반·미래 아닌 시행일 등은 400을 반환한다.
 * 폼 모델 → API 매핑(body → content, effectiveDate → expectedActivatedOn)은 호출부에서 처리한다.
 */
export interface UpdateAgreementInput {
  content?: string;
  /** 시행 예정일 (YYYY-MM-DD). 미래여야 한다. */
  expectedActivatedOn?: string;
  required?: boolean;
}

export async function updateAgreement(id: number, patch: UpdateAgreementInput): Promise<void> {
  await apiRequest<Record<string, never>>(`/admins/agreements/${id}`, {
    method: "PUT",
    body: patch,
  });
}

/**
 * 약관을 수동 활성화한다. (PUT /admins/agreements/:id/active — 바디 없음)
 * 대상 pending 약관을 active로, 같은 type의 기존 active는 archived로 원자적으로 전이한다.
 * pending이 아니거나 없는 약관이면 400, 도메인 상태 위반 시 409 등을 반환한다.
 */
export async function activateAgreement(id: number): Promise<void> {
  await apiRequest<Record<string, never>>(`/admins/agreements/${id}/active`, {
    method: "PUT",
  });
}

/**
 * 새 약관 버전을 등록한다. (POST /admins/agreements)
 * 서버는 version 형식(^\d+(\.\d+)*$)·필드 검증 실패 시 400을 반환한다. 응답 본문은 없다.
 * 폼 → API 매핑은 호출부에서 처리한다. (effectiveDate → expectedActivatedOn, body → content)
 */
export interface CreateAgreementInput {
  type: AgreementType;
  version: string;
  required: boolean;
  title: string;
  content: string;
  /** 시행 예정일 (YYYY-MM-DD). */
  expectedActivatedOn: string;
}

export async function createAgreement(input: CreateAgreementInput): Promise<void> {
  await apiRequest<Record<string, never>>("/admins/agreements", {
    method: "POST",
    body: input,
  });
}
