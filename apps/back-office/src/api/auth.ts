// 관리자 인증 API (/admins/auth/*) 접근 계층.

import { apiRequest } from "./client";

export type AdminStatus = "active" | "disabled";

/** 로그인 응답에 포함되는 관리자 기본 정보. */
export interface Admin {
  id: number;
  email: string;
  name: string | null;
  status: AdminStatus;
}

/** GET /me 프로필. Admin 에 감사 시각을 더한 형태. */
export interface AdminProfile extends Admin {
  createdAt: string;
  updatedAt: string;
}

export interface GoogleLoginInput {
  email: string;
  name?: string;
  sub?: string;
}

export interface GoogleLoginResult {
  accessToken: string;
  admin: Admin;
}

/**
 * 로컬 mock 구글 로그인. 실제 OAuth 리다이렉트 대신 "구글이 검증해 돌려준 이메일"을
 * 그대로 서버에 전달한다. 성공 시 액세스 토큰 + 관리자 정보를 반환한다.
 */
export function googleLogin(input: GoogleLoginInput): Promise<GoogleLoginResult> {
  return apiRequest<GoogleLoginResult>("/admins/auth/google", {
    method: "POST",
    body: input,
    auth: false,
  });
}

/** 현재 토큰의 관리자 프로필을 조회한다. (세션 복구·토큰 검증용) */
export function fetchMe(): Promise<AdminProfile> {
  return apiRequest<AdminProfile>("/admins/auth/me");
}
