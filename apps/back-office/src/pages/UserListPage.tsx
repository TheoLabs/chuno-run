import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Input, Select, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { StatusTag } from "../components/StatusTag";
import { FitTable } from "../components/FitTable";
import { listUsers, type AdminUserItem } from "../api/users";
import { ApiError } from "../api/client";
import { PROVIDER_LABEL } from "../labels";
import type { Provider, UserStatus } from "../types/domain";

const { Title } = Typography;

const PAGE_SIZE = 30;

const STATUS_OPTIONS: { value: UserStatus | "all"; label: string }[] = [
  { value: "all", label: "상태: 전체" },
  { value: "active", label: "상태: 활성" },
  { value: "suspended", label: "상태: 정지" },
  { value: "onboarding", label: "상태: 온보딩" },
  { value: "exited", label: "상태: 탈퇴" },
];

/** 서버 검색 allowlist — 이 키들에 대해 OR LIKE 검색이 걸린다. */
const SEARCH_KEYS = ["nickname", "id", "providerUserId"];

export function UserListPage() {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<UserStatus | "all">("all");
  const [applied, setApplied] = useState({ keyword: "", status: "all" as UserStatus | "all" });
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);

      return listUsers(
        {
          page,
          limit: PAGE_SIZE,
          statuses: applied.status === "all" ? undefined : [applied.status],
          // 검색어가 없으면 키도 보내지 않는다(서버가 검색 절을 아예 붙이지 않도록).
          searchKeys: applied.keyword.trim() ? SEARCH_KEYS : undefined,
          searchValue: applied.keyword.trim() || undefined,
        },
        signal,
      )
        .then((data) => {
          setUsers(data.items);
          setTotal(data.total);
          setError(null);
        })
        .catch((e: unknown) => {
          if (signal?.aborted) return;
          setError(e instanceof ApiError ? e.message : "목록을 불러오지 못했습니다.");
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [applied, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** 검색 조건이 바뀌면 1페이지부터 다시 본다. */
  const search = () => {
    setPage(1);
    setApplied({ keyword, status });
  };

  const columns: ColumnsType<AdminUserItem> = [
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
    { title: "경주", dataIndex: "raceCount", key: "raceCount", width: 80 },
    { title: "가입일", dataIndex: "joinOn", key: "joinOn" },
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

      {error && <Alert type="error" message={error} showIcon />}

      <Space.Compact style={{ width: "100%" }}>
        <Input
          placeholder="닉네임 · ID · 제공자 식별자 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={search}
          allowClear
        />
        <Select<UserStatus | "all">
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          style={{ width: 180 }}
        />
        <Button type="primary" onClick={search}>
          검색
        </Button>
      </Space.Compact>

      <Card className="page-fill" styles={{ body: { padding: 0 } }}>
        <FitTable<AdminUserItem>
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: PAGE_SIZE,
            showSizeChanger: false,
            onChange: setPage,
            showTotal: (t) => `총 ${t.toLocaleString()}명`,
          }}
        />
      </Card>
    </div>
  );
}
