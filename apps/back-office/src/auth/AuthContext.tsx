// 관리자 인증 상태 관리.
// - accessToken + admin 을 보관하고 localStorage 에 영속한다.
// - 앱 부팅 시 토큰이 있으면 GET /me 로 세션을 복구하고, 실패하면 토큰을 폐기한다.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { setAuthToken } from "../api/client";
import { fetchMe, googleLogin } from "../api/auth";
import type { Admin, GoogleLoginInput } from "../api/auth";

const STORAGE_KEY = "chuno.backoffice.auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface StoredAuth {
  accessToken: string;
  admin: Admin;
}

interface AuthContextValue {
  admin: Admin | null;
  accessToken: string | null;
  /** loading: 세션 복구 중, authenticated/unauthenticated: 확정 상태. */
  status: AuthStatus;
  login: (input: GoogleLoginInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

function writeStored(value: StoredAuth | null): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage 사용 불가 환경은 무시 (세션은 메모리로만 유지).
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // localStorage 는 최초 1회만 읽는다.
  const [initial] = useState<StoredAuth | null>(() => readStored());
  const [accessToken, setAccessToken] = useState<string | null>(initial?.accessToken ?? null);
  const [admin, setAdmin] = useState<Admin | null>(initial?.admin ?? null);
  // 저장된 토큰이 있으면 /me 검증이 끝날 때까지 loading.
  const [restoring, setRestoring] = useState<boolean>(Boolean(initial));

  // 부팅 시 세션 복구.
  useEffect(() => {
    if (!initial) return;
    setAuthToken(initial.accessToken);

    let cancelled = false;
    fetchMe()
      .then((profile) => {
        if (cancelled) return;
        const next: Admin = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          status: profile.status,
        };
        setAdmin(next);
        writeStored({ accessToken: initial.accessToken, admin: next });
      })
      .catch(() => {
        // 토큰 만료·무효 등 → 폐기하고 로그인으로.
        if (cancelled) return;
        setAuthToken(null);
        setAccessToken(null);
        setAdmin(null);
        writeStored(null);
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initial]);

  const value = useMemo<AuthContextValue>(() => {
    const login = async (input: GoogleLoginInput): Promise<void> => {
      const result = await googleLogin(input);
      setAuthToken(result.accessToken);
      setAccessToken(result.accessToken);
      setAdmin(result.admin);
      writeStored({ accessToken: result.accessToken, admin: result.admin });
    };

    const logout = (): void => {
      // 서버 로그아웃 엔드포인트가 없으므로 클라에서 토큰을 폐기한다.
      setAuthToken(null);
      setAccessToken(null);
      setAdmin(null);
      writeStored(null);
    };

    const status: AuthStatus = restoring
      ? "loading"
      : accessToken && admin
        ? "authenticated"
        : "unauthenticated";

    return { admin, accessToken, status, login, logout };
  }, [admin, accessToken, restoring]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 는 AuthProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}
