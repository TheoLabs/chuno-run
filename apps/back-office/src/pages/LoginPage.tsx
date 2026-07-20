import { useState } from "react";
import { Button, Card, Form, Input, Modal, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

const { Title, Text } = Typography;

// 로컬 mock 이라 로그인에 이메일이 필요하다. 시드된 초기 관리자 힌트.
const HINT_EMAIL = "admin@chuno.run";

/** 구글 브랜드 'G' 마크 (인라인 SVG). */
function GoogleMark() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9081c1.7018-1.5668 2.6842-3.874 2.6842-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9081-2.2581c-.8059.54-1.8368.859-3.0483.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [chooserOpen, setChooserOpen] = useState(false);
  const [email, setEmail] = useState(HINT_EMAIL);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // "Google로 로그인" → 실제 OAuth 리다이렉트 대신, 구글 계정 선택을 흉내내는
  // 로컬 이메일 입력 모달을 연다.
  const openChooser = () => {
    setEmail(HINT_EMAIL);
    setErrorMessage(null);
    setChooserOpen(true);
  };

  const submitLogin = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    setChooserOpen(false);
    setLoading(true);
    setErrorMessage(null);
    try {
      // 로컬 mock: 선택한 계정 이메일을 "구글이 검증해 돌려준 이메일"로 흉내내 서버에 전달한다.
      // 서버가 등록/활성 여부를 판정해 401(미등록)·403(비활성)을 돌려준다.
      await login({ email: trimmed });
      navigate("/", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "로그인 중 오류가 발생했습니다.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
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

        <Button
          size="large"
          block
          icon={<GoogleMark />}
          onClick={openChooser}
          loading={loading}
        >
          Google로 로그인
        </Button>

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

      {/* 로컬 mock: 실제 구글 OAuth 계정 선택 화면 대신 이메일을 직접 받아 검증된 신원을 흉내낸다. */}
      <Modal
        title="Google 계정 선택"
        open={chooserOpen}
        onOk={submitLogin}
        onCancel={() => setChooserOpen(false)}
        okText="이 계정으로 계속"
        cancelText="취소"
        okButtonProps={{ disabled: !email.trim() }}
        confirmLoading={loading}
        destroyOnHidden
      >
        <Form layout="vertical" onFinish={submitLogin}>
          <Form.Item
            label="이메일"
            help="로컬 개발용 mock 로그인입니다. 실제 구글 인증은 수행하지 않습니다."
          >
            <Input
              type="email"
              autoFocus
              value={email}
              placeholder={HINT_EMAIL}
              onChange={(e) => setEmail(e.target.value)}
              onPressEnter={submitLogin}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
