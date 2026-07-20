/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** core-api 베이스 URL. 미설정 시 http://localhost:3000 로 폴백. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
