import { useMemo, useState } from "react";
import { Button, Card, Input, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { StatusTag } from "../components/StatusTag";
import { mockUsers } from "../mock/users";
import type { AdminUser, UserStatus } from "../mock/types";

const { Title } = Typography;

const STATUS_OPTIONS: { value: UserStatus | "all"; label: string }[] = [
  { value: "all", label: "상태: 전체" },
  { value: "active", label: "active" },
  { value: "suspended", label: "suspended" },
  { value: "onboarding", label: "onboarding" },
  { value: "exited", label: "exited" },
];

export function UserListPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<UserStatus | "all">("all");
  const [applied, setApplied] = useState({ keyword: "", status: "all" as UserStatus | "all" });

  const filtered = useMemo(() => {
    return mockUsers.filter((u) => {
      const matchStatus = applied.status === "all" || u.status === applied.status;
      const kw = applied.keyword.trim().toLowerCase();
      const matchKeyword =
        !kw ||
        (u.nickname ?? "").toLowerCase().includes(kw) ||
        String(u.id).includes(kw);
      return matchStatus && matchKeyword;
    });
  }, [applied]);

  const columns: ColumnsType<AdminUser> = [
    { title: "ID", dataIndex: "id", key: "id", width: 90 },
    {
      title: "닉네임",
      dataIndex: "nickname",
      key: "nickname",
      render: (nickname: string | null) => nickname ?? "(미설정)",
    },
    { title: "provider", dataIndex: "provider", key: "provider" },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (s: UserStatus) => <StatusTag status={s} />,
    },
    { title: "가입일", dataIndex: "joinedAt", key: "joinedAt" },
    {
      title: "",
      key: "action",
      width: 90,
      render: (_, record) => (
        <Button size="small" onClick={() => navigate(`/users/${record.id}`)}>
          상세
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Title level={4} style={{ margin: 0 }}>
        사용자 관리
      </Title>

      <Space.Compact style={{ width: "100%" }}>
        <Input
          placeholder="닉네임 · 이메일 · ID 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => setApplied({ keyword, status })}
          allowClear
        />
        <Select<UserStatus | "all">
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          style={{ width: 180 }}
        />
        <Button type="primary" onClick={() => setApplied({ keyword, status })}>
          검색
        </Button>
      </Space.Compact>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<AdminUser>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          pagination={{
            total: 1284,
            pageSize: 30,
            showSizeChanger: false,
            showTotal: (total) => `총 ${total.toLocaleString()}명`,
          }}
        />
      </Card>
    </Space>
  );
}
