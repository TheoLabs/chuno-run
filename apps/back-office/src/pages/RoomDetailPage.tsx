import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Descriptions, Space, Spin, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { StatusTag } from "../components/StatusTag";
import { FitTable } from "../components/FitTable";
import {
  cancelRoom,
  getRoom,
  type AdminRoomDetail,
  type AdminRoomParticipant,
} from "../api/rooms";
import { ApiError } from "../api/client";
import type { RoomStatus } from "../types/domain";

const { Title, Text } = Typography;

/** 아직 끝나지 않은 방만 강제 취소할 수 있다. */
const CANCELLABLE: RoomStatus[] = ["recruiting", "ready", "live"];

function formatKm(meter: number): string {
  return `${(meter / 1000).toFixed(meter % 1000 === 0 ? 0 : 1)}km`;
}

/** 완주 기준 페이스 — 제한 시간을 목표 거리로 나눈 값. */
function finishPace(goalDistanceMeter: number, goalLimitMinutes: number): string {
  const km = goalDistanceMeter / 1000;
  if (km <= 0 || goalLimitMinutes <= 0) return "-";
  const seconds = Math.round((goalLimitMinutes * 60) / km);
  return `${Math.floor(seconds / 60)}'${String(seconds % 60).padStart(2, "0")}"/km`;
}

/** 초 → "MM'SS\"" (1시간 넘으면 H:MM:SS). */
function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "-";
  const two = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}'${two(s)}"`;
}

/** 초/km → "M'SS\"/km". */
function formatPace(paceSecondsPerKm: number | null): string {
  if (paceSecondsPerKm == null) return "-";
  const two = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(paceSecondsPerKm / 60)}'${two(paceSecondsPerKm % 60)}"/km`;
}

const participantColumns: ColumnsType<AdminRoomParticipant> = [
  {
    title: "순위",
    dataIndex: "finalRank",
    key: "finalRank",
    width: 70,
    render: (rank: number | null) => (rank == null ? "-" : `${rank}위`),
  },
  {
    title: "닉네임",
    dataIndex: "nickname",
    key: "nickname",
    render: (nickname: string | null) => nickname ?? "(미설정)",
  },
  {
    title: "상태",
    dataIndex: "status",
    key: "status",
    render: (s: string) => <StatusTag status={s} kind="participation" />,
  },
  {
    title: "현재 거리",
    dataIndex: "currentDistanceMeter",
    key: "currentDistanceMeter",
    render: (meter: number) => formatKm(meter),
  },
  {
    title: "기록",
    dataIndex: "elapsedSeconds",
    key: "elapsedSeconds",
    render: (seconds: number | null) => formatDuration(seconds),
  },
  {
    title: "페이스",
    dataIndex: "paceSecondsPerKm",
    key: "paceSecondsPerKm",
    render: (pace: number | null) => formatPace(pace),
  },
  {
    title: "완주 시각",
    dataIndex: "finishedOn",
    key: "finishedOn",
    render: (value: string | null) => value ?? "-",
  },
];

export function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { modal, message } = App.useApp();

  const roomId = Number(id);

  const [room, setRoom] = useState<AdminRoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) =>
      getRoom(roomId, signal)
        .then((data) => {
          setRoom(data);
          setError(null);
        })
        .catch((e: unknown) => {
          if (signal?.aborted) return;
          setError(e instanceof ApiError ? e.message : "방을 불러오지 못했습니다.");
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        }),
    [roomId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const forceCancel = () => {
    modal.confirm({
      title: "이 방을 강제 취소할까요?",
      content: "모집·진행 중 방을 운영상 취소합니다. 진행 중이었다면 달리던 참가자는 미완주로 정리됩니다.",
      okText: "강제 취소",
      okButtonProps: { danger: true },
      cancelText: "취소",
      onOk: async () => {
        setCancelling(true);
        try {
          await cancelRoom(roomId);
          await load();
          message.success("방을 강제 취소했습니다.");
        } catch (e: unknown) {
          message.error(e instanceof ApiError ? e.message : "취소하지 못했습니다.");
        } finally {
          setCancelling(false);
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

  if (!room) {
    return (
      <Space direction="vertical" size={16}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/rooms")}>
          목록으로
        </Button>
        <Text>{error ?? `방을 찾을 수 없습니다. (#${id})`}</Text>
      </Space>
    );
  }

  const isFinished = room.status === "finished";

  return (
    <div className="page-column">
      <Space align="center">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/rooms")} />
        <Title level={4} style={{ margin: 0 }}>
          방 상세 — {room.title} (#{room.id})
        </Title>
      </Space>

      {error && <Alert type="error" message={error} showIcon />}

      <Card title="방 정보" extra={<StatusTag status={room.status} kind="room" />}>
        <Descriptions column={{ xs: 1, md: 2 }} size="small">
          <Descriptions.Item label="방장">
            {room.hostNickname ?? "-"} (#{room.hostUserId})
          </Descriptions.Item>
          <Descriptions.Item label="목표 거리">
            {formatKm(room.goalDistanceMeter)}
          </Descriptions.Item>
          <Descriptions.Item label="제한 시간">{room.goalLimitMinutes} 분</Descriptions.Item>
          <Descriptions.Item label="정원">
            {room.currentParticipantCount} / {room.capacity}
          </Descriptions.Item>
          <Descriptions.Item label="시작">{room.startOn}</Descriptions.Item>
          <Descriptions.Item label="종료 예정">{room.endsOn}</Descriptions.Item>
          <Descriptions.Item label="완주 페이스">
            {finishPace(room.goalDistanceMeter, room.goalLimitMinutes)}
          </Descriptions.Item>
          <Descriptions.Item label="종료 시각">{room.finishedOn ?? "-"}</Descriptions.Item>
        </Descriptions>

        <Space align="center" style={{ marginTop: 14 }} wrap>
          <Button
            danger
            loading={cancelling}
            disabled={!CANCELLABLE.includes(room.status)}
            onClick={forceCancel}
          >
            강제 취소
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            모집·대기·진행 중 방만 취소할 수 있습니다.
          </Text>
        </Space>
      </Card>

      <Card className="page-fill" title={`참가자 (${room.participants.length})`}>
        <FitTable<AdminRoomParticipant>
          columns={participantColumns}
          dataSource={room.participants}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {isFinished && (
        <Card title="경주 결과">
          <Text type="secondary" style={{ fontSize: 12 }}>
            종료된 경주입니다. 최종 순위·거리·기록·페이스는 위 참가자 표에 확정되어 있습니다.
            (완주자는 목표 도달 순, 미완주자는 완주자 뒤 누적 거리순)
          </Text>
        </Card>
      )}
    </div>
  );
}
