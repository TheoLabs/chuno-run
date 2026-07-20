import { useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Row,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { StatusTag } from "../components/StatusTag";
import { getParticipations, getUserById } from "../mock/users";
import type { UserParticipation, UserStatus } from "../mock/types";

const { Title, Text } = Typography;

const historyColumns: ColumnsType<UserParticipation> = [
  { title: "방", dataIndex: "roomTitle", key: "roomTitle" },
  {
    title: "상태",
    dataIndex: "status",
    key: "status",
    render: (s: string) => <StatusTag status={s} />,
  },
  { title: "등수", dataIndex: "rank", key: "rank" },
  { title: "거리", dataIndex: "distance", key: "distance" },
];

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { modal, message } = App.useApp();

  const userId = Number(id);
  const user = getUserById(userId);
  const [status, setStatus] = useState<UserStatus>(user?.status ?? "active");

  if (!user) {
    return (
      <Space direction="vertical" size={16}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/users")}>
          목록으로
        </Button>
        <Text>사용자를 찾을 수 없습니다. (#{id})</Text>
      </Space>
    );
  }

  const changeStatus = (next: UserStatus, label: string) => {
    let reason = "";
    modal.confirm({
      title: `계정 상태를 '${next}'(으)로 변경할까요?`,
      content: (
        <Space direction="vertical" style={{ width: "100%", marginTop: 8 }}>
          <Text type="secondary">{label}</Text>
          <Input.TextArea
            placeholder="사유 입력 (선택)"
            rows={3}
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </Space>
      ),
      okText: "변경",
      cancelText: "취소",
      onOk: () => {
        setStatus(next);
        message.success(
          `상태를 ${next}(으)로 변경했습니다${reason ? ` · 사유: ${reason}` : ""}`,
        );
      },
    });
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space align="center">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/users")} />
        <Title level={4} style={{ margin: 0 }}>
          사용자 상세 — {user.nickname ?? "(미설정)"} (#{user.id})
        </Title>
      </Space>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="프로필" style={{ height: "100%" }}>
            <Descriptions column={1} size="small" styles={{ label: { width: 90 } }}>
              <Descriptions.Item label="닉네임">
                {user.nickname ?? "(미설정)"}
              </Descriptions.Item>
              <Descriptions.Item label="provider">{user.provider}</Descriptions.Item>
              <Descriptions.Item label="상태">
                <StatusTag status={status} />
              </Descriptions.Item>
              <Descriptions.Item label="가입일">{user.joinedAt}</Descriptions.Item>
              <Descriptions.Item label="최근 접속">{user.lastSeenAt}</Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 20 }}>
              상태 변경
            </Title>
            <Space wrap>
              <Button
                danger
                disabled={status === "suspended"}
                onClick={() => changeStatus("suspended", "계정을 정지하면 로그인·경주 참가가 제한됩니다.")}
              >
                계정 정지 (suspended)
              </Button>
              <Button
                disabled={status === "active"}
                onClick={() => changeStatus("active", "정지를 해제하면 정상 이용이 가능합니다.")}
              >
                정지 해제 (active)
              </Button>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                상태 변경 시 확인 모달 → 사유 입력(선택).
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="경주 참가 이력" style={{ height: "100%" }}>
            <Table<UserParticipation>
              columns={historyColumns}
              dataSource={getParticipations(userId)}
              rowKey="roomTitle"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
