/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** core-api 베이스 URL. 미설정 시 http://localhost:3000 로 폴백. */
  readonly VITE_API_BASE_URL?: string;
  /** 구글 로그인 클라이언트 ID (공개값). Google Identity Services 로 ID token 발급. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
