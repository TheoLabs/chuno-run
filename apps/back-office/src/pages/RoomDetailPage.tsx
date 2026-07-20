import { useState } from "react";
import {
  App,
  Button,
  Card,
  Descriptions,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { StatusTag } from "../components/StatusTag";
import { getRoomById, mockParticipants, mockResults } from "../mock/rooms";
import type { RoomParticipant, RoomResult, RoomStatus } from "../mock/types";

const { Title, Text } = Typography;

const participantColumns: ColumnsType<RoomParticipant> = [
  { title: "순위", dataIndex: "rank", key: "rank", width: 70 },
  { title: "닉네임", dataIndex: "nickname", key: "nickname" },
  {
    title: "상태",
    dataIndex: "status",
    key: "status",
    render: (s: string) => <StatusTag status={s} />,
  },
  { title: "현재 거리", dataIndex: "currentDistance", key: "currentDistance" },
  { title: "완주 시각", dataIndex: "finishedAt", key: "finishedAt" },
];

const resultColumns: ColumnsType<RoomResult> = [
  { title: "등수", dataIndex: "rank", key: "rank", width: 70 },
  { title: "닉네임", dataIndex: "nickname", key: "nickname" },
  { title: "기록", dataIndex: "record", key: "record" },
  { title: "페이스", dataIndex: "pace", key: "pace" },
  { title: "거리", dataIndex: "distance", key: "distance" },
];

const CANCELLABLE: RoomStatus[] = ["recruiting", "ready", "live"];

export function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { modal, message } = App.useApp();

  const room = getRoomById(Number(id));
  const [status, setStatus] = useState<RoomStatus>(room?.status ?? "recruiting");

  if (!room) {
    return (
      <Space direction="vertical" size={16}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/rooms")}>
          목록으로
        </Button>
        <Text>방을 찾을 수 없습니다. (#{id})</Text>
      </Space>
    );
  }

  const forceCancel = () => {
    modal.confirm({
      title: "이 방을 강제 취소할까요?",
      content: "모집·진행 중 방을 운영상 취소합니다. 참가자에게 반영됩니다.",
      okText: "강제 취소",
      okButtonProps: { danger: true },
      cancelText: "취소",
      onOk: () => {
        setStatus("cancelled");
        message.success("방을 강제 취소했습니다.");
      },
    });
  };

  const isFinished = status === "finished";

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space align="center">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/rooms")} />
        <Title level={4} style={{ margin: 0 }}>
          방 상세 — {room.title} (#{room.id})
        </Title>
      </Space>

      <Card
        title="방 정보"
        extra={<StatusTag status={status} />}
      >
        <Descriptions column={{ xs: 1, md: 2 }} size="small">
          <Descriptions.Item label="방장">
            {room.hostNickname}
            {room.hostId ? ` (#${room.hostId})` : ""}
          </Descriptions.Item>
          <Descriptions.Item label="목표 거리">
            {room.targetDistanceKm?.toFixed(1)} km
          </Descriptions.Item>
          <Descriptions.Item label="제한 시간">{room.limitMinutes} 분</Descriptions.Item>
          <Descriptions.Item label="정원">
            {room.joined} / {room.capacity}
          </Descriptions.Item>
          <Descriptions.Item label="시작">{room.startAt}</Descriptions.Item>
          <Descriptions.Item label="완주 페이스">{room.finishPace}</Descriptions.Item>
        </Descriptions>

        <Space align="center" style={{ marginTop: 14 }} wrap>
          <Button danger disabled={!CANCELLABLE.includes(status)} onClick={forceCancel}>
            강제 취소
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            모집·진행 중 방을 운영상 취소. 참가자에 반영.
          </Text>
        </Space>
      </Card>

      <Card title={`참가자 (${mockParticipants.length})`}>
        <Table<RoomParticipant>
          columns={participantColumns}
          dataSource={mockParticipants}
          rowKey="nickname"
          pagination={false}
          size="small"
        />
      </Card>

      <Card
        title="경주 결과"
        extra={<Text type="secondary" style={{ fontSize: 12 }}>종료(finished) 방에서만 표시</Text>}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          방이 종료되면 참가자 최종 순위·기록·페이스·거리가 여기에 표시됩니다. (별도 결과 페이지 없이 방 상세에 통합)
        </Text>
        <div style={{ marginTop: 12 }}>
          {isFinished ? (
            <Table<RoomResult>
              columns={resultColumns}
              dataSource={mockResults}
              rowKey="nickname"
              pagination={false}
              size="small"
            />
          ) : (
            <Text type="secondary">
              아직 종료되지 않은 방입니다. 방이 종료되면 결과가 표시됩니다.
            </Text>
          )}
        </div>
      </Card>
    </Space>
  );
}
