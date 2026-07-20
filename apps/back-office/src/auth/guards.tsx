// 라우팅 가드. 인증 상태에 따라 접근을 제어한다.

import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "./AuthContext";

function FullPageSpinner() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Spin size="large" />
    </div>
  );
}

/** 보호 라우트. 미인증이면 /login 으로 리다이렉트, 복구 중이면 스피너. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") return <FullPageSpinner />;
  if (status === "unauthenticated") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** 로그인 페이지 가드. 이미 인증됐으면 대시보드로 리다이렉트. */
export function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") return <FullPageSpinner />;
  if (status === "authenticated") return <Navigate to="/" replace />;
  return <>{children}</>;
}
