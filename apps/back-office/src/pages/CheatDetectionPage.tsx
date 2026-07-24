import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Descriptions, Input, Modal, Space, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import { FitTable } from "../components/FitTable";
import {
  getCheatDetection,
  listCheatDetections,
  type CheatDetectionItem,
  type CheatType,
} from "../api/cheat-detections";
import { ApiError } from "../api/client";
import { CHEAT_ACTION_LABEL, CHEAT_TYPE_LABEL } from "../labels";

const { Title, Text } = Typography;
const { CheckableTag } = Tag;

const PAGE_SIZE = 25;

/** 서버 검색 allowlist — id·판정 설명으로 검색한다. */
const SEARCH_KEYS = ["id", "detail"];

const TYPE_FILTERS: { value: CheatType | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "abnormalSpeed", label: CHEAT_TYPE_LABEL.abnormalSpeed },
  { value: "spoofSuspected", label: CHEAT_TYPE_LABEL.spoofSuspected },
  { value: "timestampMismatch", label: CHEAT_TYPE_LABEL.timestampMismatch },
  { value: "impossibleFinish", label: CHEAT_TYPE_LABEL.impossibleFinish },
];

/** 'YYYY-MM-DD HH:mm:ss' → 'MM-DD HH:mm'. */
function shortDate(value: string): string {
  return value.length >= 16 ? value.slice(5, 16) : value;
}

function actionColor(action: string): string {
  return action === "voided" ? "red" : "orange";
}

export function CheatDetectionPage() {
  const navigate = useNavigate();

  const [type, setType] = useState<CheatType | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<CheatDetectionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<CheatDetectionItem | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);

      return listCheatDetections(
        {
          page,
          limit: PAGE_SIZE,
          types: type === "all" ? undefined : [type],
          searchKeys: appliedKeyword.trim() ? SEARCH_KEYS : undefined,
          searchValue: appliedKeyword.trim() || undefined,
        },
        signal,
      )
        .then((data) => {
          setRows(data.items);
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
    [appliedKeyword, page, type],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const changeType = (next: CheatType | "all") => {
    setPage(1);
    setType(next);
  };

  const search = () => {
    setPage(1);
    setAppliedKeyword(keyword);
  };

  const openDetail = async (id: number) => {
    try {
      setDetail(await getCheatDetection(id));
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "상세를 불러오지 못했습니다.");
    }
  };

  const columns: ColumnsType<CheatDetectionItem> = [
    {
      title: "탐지 시각",
      dataIndex: "detectedOn",
      key: "detectedOn",
      render: (v: string) => shortDate(v),
    },
    {
      title: "사용자",
      key: "user",
      render: (_, r) => (r.nickname ? `${r.nickname} (#${r.userId})` : "-"),
    },
    {
      title: "방",
      key: "room",
      render: (_, r) => (r.roomTitle ? `#${r.roomId} ${r.roomTitle}` : "-"),
    },
    {
      title: "유형",
      dataIndex: "type",
      key: "type",
      render: (t: string) => <Tag>{CHEAT_TYPE_LABEL[t] ?? t}</Tag>,
    },
    {
      title: "조치",
      dataIndex: "action",
      key: "action",
      render: (a: string) => <Tag color={actionColor(a)}>{CHEAT_ACTION_LABEL[a] ?? a}</Tag>,
    },
    {
      title: "판정 근거",
      dataIndex: "detail",
      key: "detail",
      ellipsis: true,
      render: (d: string | null) => d ?? "-",
    },
    {
      title: "",
      key: "action-btn",
      width: 90,
      render: (_, record) => (
        <Button size="small" onClick={() => openDetail(record.id)}>
          상세
        </Button>
      ),
    },
  ];

  return (
    <div className="page-column">
      <Title level={4} style={{ margin: 0 }}>
        부정행위 탐지 이력
      </Title>
      <Text type="secondary" style={{ fontSize: 12 }}>
        서버 정합성 검사에 걸린 보고입니다. 무효(voided)는 해당 경주 기록이 미완주로 처리됩니다.
        제재가 필요하면 사용자 상세에서 정지하세요.
      </Text>

      {error && <Alert type="error" message={error} showIcon />}

      <Space style={{ width: "100%" }} wrap>
        <Space size={6} wrap>
          {TYPE_FILTERS.map((f) => (
            <CheckableTag
              key={f.value}
              checked={type === f.value}
              onChange={() => changeType(f.value)}
              style={{ padding: "4px 12px", fontSize: 13 }}
            >
              {f.label}
            </CheckableTag>
          ))}
        </Space>
        <Input.Search
          placeholder="ID · 판정 설명 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={search}
          allowClear
          style={{ width: 240 }}
        />
      </Space>

      <Card className="page-fill" styles={{ body: { padding: 0 } }}>
        <FitTable<CheatDetectionItem>
          columns={columns}
          dataSource={rows}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: PAGE_SIZE,
            showSizeChanger: false,
            onChange: setPage,
            showTotal: (t) => `총 ${t}건`,
          }}
        />
      </Card>

      <Modal
        title="탐지 상세"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={
          detail?.userId
            ? [
                <Button key="close" onClick={() => setDetail(null)}>
                  닫기
                </Button>,
                <Button key="user" type="primary" onClick={() => navigate(`/users/${detail.userId}`)}>
                  사용자 상세로
                </Button>,
              ]
            : [
                <Button key="close" onClick={() => setDetail(null)}>
                  닫기
                </Button>,
              ]
        }
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" styles={{ label: { width: 110 } }}>
              <Descriptions.Item label="사용자">
                {detail.nickname ? `${detail.nickname} (#${detail.userId})` : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="방">
                {detail.roomTitle ? `#${detail.roomId} ${detail.roomTitle}` : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="유형">
                <Tag>{CHEAT_TYPE_LABEL[detail.type] ?? detail.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="자동 조치">
                <Tag color={actionColor(detail.action)}>
                  {CHEAT_ACTION_LABEL[detail.action] ?? detail.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="보고 거리">{detail.reportedDistanceMeter}m</Descriptions.Item>
              <Descriptions.Item label="인정 거리">{detail.acceptedDistanceMeter}m</Descriptions.Item>
              {detail.observedSpeedMps != null && (
                <Descriptions.Item label="관측 속도">{detail.observedSpeedMps} m/s</Descriptions.Item>
              )}
              {detail.thresholdSpeedMps != null && (
                <Descriptions.Item label="임계 속도">{detail.thresholdSpeedMps} m/s</Descriptions.Item>
              )}
              {detail.intervalSeconds != null && (
                <Descriptions.Item label="구간">{detail.intervalSeconds}s</Descriptions.Item>
              )}
              <Descriptions.Item label="판정 근거">{detail.detail ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="탐지 시각">{detail.detectedOn}</Descriptions.Item>
            </Descriptions>
            <Text type="secondary" style={{ fontSize: 12 }}>
              원시 GPS 좌표는 보존하지 않으므로, 판단 근거는 거리·시간 관측값입니다.
            </Text>
          </>
        )}
      </Modal>
    </div>
  );
}
