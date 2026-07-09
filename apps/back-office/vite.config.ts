import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 대시보드(issue-board)가 5173을 쓰므로 백오피스는 5174로 둔다.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
});
