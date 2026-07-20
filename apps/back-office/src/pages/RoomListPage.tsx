import { useMemo, useState } from "react";
import { Button, Card, Input, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { StatusTag } from "../components/StatusTag";
import { mockRooms } from "../mock/rooms";
import type { AdminRoom, RoomStatus } from "../mock/types";

const { Title } = Typography;
const { CheckableTag } = Tag;

const FILTERS: { value: RoomStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "recruiting", label: "recruiting" },
  { value: "ready", label: "ready" },
  { value: "live", label: "live" },
  { value: "finished", label: "finished" },
  { value: "cancelled", label: "cancelled" },
];

export function RoomListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return mockRooms.filter((r) => {
      const matchStatus = filter === "all" || r.status === filter;
      const matchKeyword =
        !kw ||
        r.title.toLowerCase().includes(kw) ||
        r.hostNickname.toLowerCase().includes(kw);
      return matchStatus && matchKeyword;
    });
  }, [filter, keyword]);

  const columns: ColumnsType<AdminRoom> = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    { title: "제목", dataIndex: "title", key: "title" },
    { title: "방장", dataIndex: "hostNickname", key: "hostNickname" },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (s: RoomStatus) => <StatusTag status={s} />,
    },
    {
      title: "정원",
      key: "capacity",
      render: (_, r) => `${r.joined}/${r.capacity}`,
    },
    { title: "시작", dataIndex: "startAt", key: "startAt" },
    {
      title: "",
      key: "action",
      width: 90,
      render: (_, record) => (
        <Button size="small" onClick={() => navigate(`/rooms/${record.id}`)}>
          상세
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={4} style={{ margin: 0 }}>
        방(경주) 관리
      </Title>

      <Space style={{ width: "100%" }} wrap>
        <Space size={6} wrap>
          {FILTERS.map((f) => (
            <CheckableTag
              key={f.value}
              checked={filter === f.value}
              onChange={() => setFilter(f.value)}
              style={{ padding: "4px 12px", fontSize: 13 }}
            >
              {f.label}
            </CheckableTag>
          ))}
        </Space>
        <Input
          placeholder="방 제목 · 방장 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          allowClear
          style={{ width: 240 }}
        />
      </Space>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<AdminRoom>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          pagination={{
            total: 218,
            pageSize: 25,
            showSizeChanger: false,
            showTotal: (total) => `총 ${total}방`,
          }}
        />
      </Card>
    </Space>
  );
}
