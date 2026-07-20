// core-api 접근용 fetch 래퍼.
// - 응답은 항상 `{ data }` 한 겹으로 래핑되므로 data 를 언랩해 반환한다.
// - 에러 응답도 `{ data: { message } }` 형태 → 상태코드/메시지를 ApiError 로 파싱한다.
// - 인증이 필요한 요청에는 저장된 Bearer 토큰을 자동 부착한다.

import { API_BASE_URL } from "./config";

/** 현재 액세스 토큰. AuthProvider 가 로그인/복구/로그아웃 시 갱신한다. */
let authToken: string | null = null;

/** 인증 토큰을 설정/해제한다. (AuthProvider 전용) */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** HTTP 에러 또는 네트워크 실패를 표현한다. status 0 은 네트워크 오류. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** JSON 직렬화해 본문으로 보낼 값. */
  body?: unknown;
  /** true 면 Bearer 토큰을 부착한다. 기본 true. 로그인 등 공개 요청은 false. */
  auth?: boolean;
  signal?: AbortSignal;
}

interface ResponseEnvelope {
  data?: unknown;
}

/** 에러 봉투 `{ data: { message } }` 에서 클라용 메시지를 뽑아낸다. */
function extractErrorMessage(payload: ResponseEnvelope | null): string | null {
  const data = payload?.data as { message?: unknown } | undefined;
  if (data && typeof data.message === "string") return data.message;
  return null;
}

/**
 * core-api 요청을 보내고 `data` 를 언랩해 반환한다.
 * 실패 시 ApiError(status, message) 를 던진다.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && authToken) headers["Authorization"] = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiError(0, "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }

  const payload = (await response.json().catch(() => null)) as ResponseEnvelope | null;

  if (!response.ok) {
    const message = extractErrorMessage(payload) ?? `요청을 처리할 수 없습니다. (${response.status})`;
    throw new ApiError(response.status, message);
  }

  return payload?.data as T;
}
