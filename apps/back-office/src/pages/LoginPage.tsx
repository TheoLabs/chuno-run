import { useState } from "react";
import { Card, Typography } from "antd";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

const { Title, Text } = Typography;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 구글 로그인 성공 → credential(=ID token)을 꺼내 서버에 전달한다.
  // 서버가 토큰을 검증하고 등록/활성 여부를 판정해 401(미등록)·403(비활성)을 돌려준다.
  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      setErrorMessage("구글에서 인증 토큰을 받지 못했습니다. 다시 시도해 주세요.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await login(idToken);
      navigate("/", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "로그인 중 오류가 발생했습니다.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    setErrorMessage("구글 로그인에 실패했습니다. 다시 시도해 주세요.");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f4f5",
        padding: 24,
      }}
    >
      <Card style={{ width: 340 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={4} style={{ marginBottom: 4 }}>
            추노 백오피스
          </Title>
          <Text type="secondary">사내 관리자 전용</Text>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            // 로그인 처리 중에는 버튼을 비활성처럼 흐리게 표시한다.
            opacity: loading ? 0.6 : 1,
            pointerEvents: loading ? "none" : "auto",
          }}
        >
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            text="signin_with"
            shape="rectangular"
          />
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            사전 등록된 관리자 이메일만 로그인할 수 있어요.
          </Text>
        </div>

        {errorMessage && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 6,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: 12,
              textAlign: "center",
            }}
            role="alert"
          >
            {errorMessage}
          </div>
        )}
      </Card>
    </div>
  );
}
