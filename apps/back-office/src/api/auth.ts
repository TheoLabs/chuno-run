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
  /** Google Identity Services 로 발급받은 ID token (JWT). */
  idToken: string;
}

export interface GoogleLoginResult {
  accessToken: string;
}

/**
 * 구글 로그인. 브라우저에서 Google Identity Services 로 받은 ID token 을 서버에 전달한다.
 * 서버가 토큰을 검증하고 등록/활성 여부를 판정해 액세스 토큰을 반환한다.
 * (관리자 정보는 GET /me 로 별도 조회. 미등록/미인증 → 401, 비활성 → 403)
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
