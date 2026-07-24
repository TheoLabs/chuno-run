import { useEffect, useState } from "react";
import { Alert, Card, Col, Row, Space, Spin, Statistic, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { StatusTag } from "../components/StatusTag";
import { FitTable } from "../components/FitTable";
import { getDashboard, type DashboardRecentRoom, type DashboardSummary } from "../api/dashboard";
import { ApiError } from "../api/client";
import type { RoomStatus } from "../types/domain";

const { Title, Text } = Typography;

/** 목표 거리 표시 — 딱 떨어지면 정수 km, 아니면 소수 1자리. */
function formatKm(meter: number): string {
  return `${(meter / 1000).toFixed(meter % 1000 === 0 ? 0 : 1)}km`;
}

/** 'YYYY-MM-DD HH:mm:ss' → 'MM-DD HH:mm' (표에서 폭을 아끼려고 연도를 뗀다). */
function formatShortDate(value: string): string {
  return value.length >= 16 ? value.slice(5, 16) : value;
}

const columns: ColumnsType<DashboardRecentRoom> = [
  { title: "방", dataIndex: "title", key: "title" },
  {
    title: "상태",
    dataIndex: "status",
    key: "status",
    render: (status: RoomStatus) => <StatusTag status={status} kind="room" />,
  },
  {
    title: "방장",
    dataIndex: "hostNickname",
    key: "hostNickname",
    render: (nickname: string | null) => nickname ?? "-",
  },
  {
    title: "목표",
    dataIndex: "goalDistanceMeter",
    key: "goalDistanceMeter",
    render: (meter: number) => formatKm(meter),
  },
  { title: "참가", dataIndex: "participantCount", key: "participantCount" },
  {
    title: "시작",
    dataIndex: "startOn",
    key: "startOn",
    render: (startOn: string) => formatShortDate(startOn),
  },
];

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getDashboard(controller.signal)
      .then((data) => {
        setSummary(data);
        setError(null);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof ApiError ? e.message : "지표를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const kpis = summary
    ? [
        { label: "누적 가입자", value: summary.totalUserCount },
        { label: "활성 방 (모집·대기·진행)", value: summary.activeRoomCount },
        { label: "오늘 경주", value: summary.todayRaceCount },
        {
          label: `완주율 (${summary.completionWindowDays}일)`,
          value: `${summary.completionRate}%`,
        },
      ]
    : [];

  return (
    <div className="page-column">
      <Title level={4} style={{ margin: 0 }}>
        대시보드
      </Title>

      {error && <Alert type="error" message={error} showIcon />}

      {loading ? (
        <Card>
          <Spin />
        </Card>
      ) : (
        summary && (
          <>
            <Row gutter={12}>
              {kpis.map((kpi) => (
                <Col key={kpi.label} xs={12} md={6}>
                  <Card>
                    <Statistic title={kpi.label} value={kpi.value} />
                  </Card>
                </Col>
              ))}
            </Row>

            <Card className="page-fill" title="최근 경주">
              <FitTable<DashboardRecentRoom>
                columns={columns}
                dataSource={summary.recentRooms}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            </Card>

            <Card title="상태별 방">
              <Space size="large" wrap>
                {(Object.keys(summary.roomCountByStatus) as RoomStatus[]).map((status) => (
                  <Space key={status} size={6}>
                    <StatusTag status={status} kind="room" />
                    <Text>{summary.roomCountByStatus[status]}</Text>
                  </Space>
                ))}
              </Space>
            </Card>

            <Card title="사용자 상태">
              <Space size="large" wrap>
                <Space size={6}>
                  <Text type="secondary">이용 중</Text>
                  <Text>{summary.activeUserCount}</Text>
                </Space>
                <Space size={6}>
                  <Text type="secondary">온보딩 중</Text>
                  <Text>{summary.onboardingUserCount}</Text>
                </Space>
                <Space size={6}>
                  <Text type="secondary">정지</Text>
                  <Text>{summary.suspendedUserCount}</Text>
                </Space>
              </Space>
            </Card>
          </>
        )
      )}
    </div>
  );
}
