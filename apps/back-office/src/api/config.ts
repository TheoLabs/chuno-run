// API 관련 설정을 한 곳에 모은다. baseUrl 은 환경변수로 주입하고 하드코딩하지 않는다.

/** core-api 베이스 URL. VITE_API_BASE_URL 로 주입, 미설정 시 로컬 기본값. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

/** 구글 로그인 클라이언트 ID (공개값). VITE_GOOGLE_CLIENT_ID 로 주입한다. */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
