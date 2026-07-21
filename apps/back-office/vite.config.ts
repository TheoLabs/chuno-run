import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8000,
  },
  // @chuno/date는 CJS로 빌드된 워크스페이스 패키지라 심볼릭 링크상 실제 경로가
  // node_modules 밖(packages/date/dist)이다. 기본값이면 Vite가 이를 ESM으로 오인해
  // named/default export를 찾지 못하므로, dev는 pre-bundle로, build는 commonjs 변환
  // 대상에 포함시켜 CJS interop을 보장한다.
  optimizeDeps: {
    include: ["@chuno/date"],
  },
  build: {
    commonjsOptions: {
      include: [/packages[\\/]date/, /node_modules/],
    },
  },
});
