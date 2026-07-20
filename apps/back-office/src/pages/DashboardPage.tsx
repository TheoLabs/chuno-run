import { Card, Col, Row, Space, Statistic, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { StatusTag } from "../components/StatusTag";
import {
  mockKpis,
  mockRecentRaces,
  mockRoomStatusCounts,
  type RecentRace,
} from "../mock/dashboard";
import type { RoomStatus } from "../mock/types";

const { Title, Text } = Typography;

const columns: ColumnsType<RecentRace> = [
  { title: "방", dataIndex: "title", key: "title" },
  {
    title: "상태",
    dataIndex: "status",
    key: "status",
    render: (status: RoomStatus) => <StatusTag status={status} />,
  },
  { title: "참가", dataIndex: "joined", key: "joined" },
  { title: "시작", dataIndex: "startAt", key: "startAt" },
];

export function DashboardPage() {
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={4} style={{ margin: 0 }}>
        대시보드
      </Title>

      <Row gutter={12}>
        {mockKpis.map((kpi) => (
          <Col key={kpi.label} xs={12} md={6}>
            <Card>
              <Statistic title={kpi.label} value={kpi.value} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="최근 경주">
        <Table<RecentRace>
          columns={columns}
          dataSource={mockRecentRaces}
          rowKey="title"
          pagination={false}
          size="middle"
        />
      </Card>

      <Card title="상태별 방">
        <Space size="large" wrap>
          {(Object.keys(mockRoomStatusCounts) as RoomStatus[]).map((status) => (
            <Space key={status} size={6}>
              <StatusTag status={status} />
              <Text>{mockRoomStatusCounts[status]}</Text>
            </Space>
          ))}
        </Space>
      </Card>
    </Space>
  );
}
