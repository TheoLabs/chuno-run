import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Spin,
  Statistic,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { StatusTag } from "../components/StatusTag";
import { activateUser, getUser, suspendUser, type AdminUserDetail } from "../api/users";
import { ApiError } from "../api/client";
import { PROVIDER_LABEL, USER_STATUS_LABEL } from "../labels";
import type { UserStatus } from "../types/domain";

const { Title, Text } = Typography;

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { modal, message } = App.useApp();

  const userId = Number(id);

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) =>
      getUser(userId, signal)
        .then((data) => {
          setUser(data);
          setError(null);
        })
        .catch((e: unknown) => {
          if (signal?.aborted) return;
          setError(e instanceof ApiError ? e.message : "사용자를 불러오지 못했습니다.");
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        }),
    [userId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /**
   * 상태 전이 — 서버가 User 도메인 규칙(active ↔ suspended)을 검증하므로
   * 실패 메시지는 서버 것을 그대로 노출한다.
   */
  const changeStatus = (next: UserStatus, description: string) => {
    modal.confirm({
      title: `계정 상태를 '${USER_STATUS_LABEL[next]}'(으)로 변경할까요?`,
      content: <Text type="secondary">{description}</Text>,
      okText: "변경",
      cancelText: "취소",
      onOk: async () => {
        setSaving(true);
        try {
          await (next === "suspended" ? suspendUser(userId) : activateUser(userId));
          await load();
          message.success(`상태를 ${USER_STATUS_LABEL[next]}(으)로 변경했습니다`);
        } catch (e: unknown) {
          message.error(e instanceof ApiError ? e.message : "상태를 변경하지 못했습니다.");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (!user) {
    return (
      <Space direction="vertical" size={16}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/users")}>
          목록으로
        </Button>
        <Text>{error ?? `사용자를 찾을 수 없습니다. (#${id})`}</Text>
      </Space>
    );
  }

  return (
    <div className="page-column">
      <Space align="center">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/users")} />
        <Title level={4} style={{ margin: 0 }}>
          사용자 상세 — {user.nickname ?? "(미설정)"} (#{user.id})
        </Title>
      </Space>

      {error && <Alert type="error" message={error} showIcon />}

      <Row gutter={16} className="page-fill">
        <Col xs={24} lg={12}>
          <Card title="프로필" style={{ height: "100%" }}>
            <Descriptions column={1} size="small" styles={{ label: { width: 110 } }}>
              <Descriptions.Item label="닉네임">
                {user.nickname ?? "(미설정)"}
              </Descriptions.Item>
              <Descriptions.Item label="가입 경로">
                {PROVIDER_LABEL[user.provider] ?? user.provider}
              </Descriptions.Item>
              <Descriptions.Item label="제공자 식별자">{user.providerUserId}</Descriptions.Item>
              <Descriptions.Item label="상태">
                <StatusTag status={user.status} kind="user" />
              </Descriptions.Item>
              <Descriptions.Item label="가입일">{user.joinOn}</Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 20 }}>
              상태 변경
            </Title>
            <Space wrap>
              <Button
                danger
                loading={saving}
                disabled={user.status !== "active"}
                onClick={() =>
                  changeStatus("suspended", "계정을 정지하면 로그인·경주 참가가 제한됩니다.")
                }
              >
                계정 정지
              </Button>
              <Button
                loading={saving}
                disabled={user.status !== "suspended"}
                onClick={() => changeStatus("active", "정지를 해제하면 정상 이용이 가능합니다.")}
              >
                정지 해제
              </Button>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                이용 중(active) 계정만 정지할 수 있고, 정지된 계정만 해제할 수 있습니다.
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="경주 참가 요약" style={{ height: "100%" }}>
            <Row gutter={[16, 16]}>
              <Col xs={12}>
                <Statistic title="참가 경주" value={user.raceCount} suffix="회" />
              </Col>
              <Col xs={12}>
                <Statistic title="완주" value={user.finishedCount} suffix="회" />
              </Col>
              <Col xs={12}>
                <Statistic title="우승" value={user.winCount} suffix="회" />
              </Col>
              <Col xs={12}>
                <Statistic title="완주율" value={user.completedRate} suffix="%" />
              </Col>
              <Col xs={24}>
                <Statistic
                  title="총 달린 거리"
                  value={(user.totalRunningDistanceMeter / 1000).toFixed(1)}
                  suffix="km"
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
