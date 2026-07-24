import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Input, Space, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { StatusTag } from "../components/StatusTag";
import { FitTable } from "../components/FitTable";
import { ROOM_STATUS_LABEL } from "../labels";
import { listRooms, type AdminRoomItem } from "../api/rooms";
import { ApiError } from "../api/client";
import type { RoomStatus } from "../types/domain";

const { Title } = Typography;
const { CheckableTag } = Tag;

const PAGE_SIZE = 25;

/** 서버 검색 allowlist — 제목과 id 로 검색한다. */
const SEARCH_KEYS = ["title", "id"];

const FILTERS: { value: RoomStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "recruiting", label: ROOM_STATUS_LABEL.recruiting },
  { value: "ready", label: ROOM_STATUS_LABEL.ready },
  { value: "live", label: ROOM_STATUS_LABEL.live },
  { value: "finished", label: ROOM_STATUS_LABEL.finished },
  { value: "cancelled", label: ROOM_STATUS_LABEL.cancelled },
];

export function RoomListPage() {
  const navigate = useNavigate();

  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [page, setPage] = useState(1);

  const [rooms, setRooms] = useState<AdminRoomItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);

      return listRooms(
        {
          page,
          limit: PAGE_SIZE,
          statuses: filter === "all" ? undefined : [filter],
          searchKeys: appliedKeyword.trim() ? SEARCH_KEYS : undefined,
          searchValue: appliedKeyword.trim() || undefined,
          // 최근 만들어진 방이 위로 오게 한다.
          sort: "id",
          order: "DESC",
        },
        signal,
      )
        .then((data) => {
          setRooms(data.items);
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
    [appliedKeyword, filter, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const changeFilter = (next: RoomStatus | "all") => {
    setPage(1);
    setFilter(next);
  };

  const search = () => {
    setPage(1);
    setAppliedKeyword(keyword);
  };

  const columns: ColumnsType<AdminRoomItem> = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    { title: "제목", dataIndex: "title", key: "title" },
    {
      title: "방장",
      dataIndex: "hostNickname",
      key: "hostNickname",
      render: (nickname: string | null) => nickname ?? "-",
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (s: RoomStatus) => <StatusTag status={s} kind="room" />,
    },
    {
      title: "목표",
      key: "goal",
      render: (_, r) =>
        `${(r.goalDistanceMeter / 1000).toFixed(r.goalDistanceMeter % 1000 === 0 ? 0 : 1)}km · ${r.goalLimitMinutes}분`,
    },
    {
      title: "정원",
      key: "capacity",
      render: (_, r) => `${r.currentParticipantCount}/${r.capacity}`,
    },
    { title: "시작", dataIndex: "startOn", key: "startOn" },
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
    <div className="page-column">
      <Title level={4} style={{ margin: 0 }}>
        방(경주) 관리
      </Title>

      {error && <Alert type="error" message={error} showIcon />}

      <Space style={{ width: "100%" }} wrap>
        <Space size={6} wrap>
          {FILTERS.map((f) => (
            <CheckableTag
              key={f.value}
              checked={filter === f.value}
              onChange={() => changeFilter(f.value)}
              style={{ padding: "4px 12px", fontSize: 13 }}
            >
              {f.label}
            </CheckableTag>
          ))}
        </Space>
        <Input.Search
          placeholder="방 제목 · ID 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={search}
          allowClear
          style={{ width: 240 }}
        />
      </Space>

      <Card className="page-fill" styles={{ body: { padding: 0 } }}>
        <FitTable<AdminRoomItem>
          columns={columns}
          dataSource={rooms}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: PAGE_SIZE,
            showSizeChanger: false,
            onChange: setPage,
            showTotal: (t) => `총 ${t}방`,
          }}
        />
      </Card>
    </div>
  );
}
