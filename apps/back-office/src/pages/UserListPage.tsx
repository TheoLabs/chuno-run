import { useMemo, useState } from "react";
import { Button, Card, Input, Select, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { StatusTag } from "../components/StatusTag";
import { FitTable } from "../components/FitTable";
import { mockUsers } from "../mock/users";
import { PROVIDER_LABEL } from "../labels";
import type { AdminUser, Provider, UserStatus } from "../mock/types";

const { Title } = Typography;

const STATUS_OPTIONS: { value: UserStatus | "all"; label: string }[] = [
  { value: "all", label: "상태: 전체" },
  { value: "active", label: "상태: 활성" },
  { value: "suspended", label: "상태: 정지" },
  { value: "onboarding", label: "상태: 온보딩" },
  { value: "exited", label: "상태: 탈퇴" },
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
    {
      title: "가입 경로",
      dataIndex: "provider",
      key: "provider",
      render: (p: Provider) => PROVIDER_LABEL[p] ?? p,
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (s: UserStatus) => <StatusTag status={s} kind="user" />,
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
    <div className="page-column">
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

      <Card className="page-fill" styles={{ body: { padding: 0 } }}>
        <FitTable<AdminUser>
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
    </div>
  );
}
