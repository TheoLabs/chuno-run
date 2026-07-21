import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
// dayjs는 back-office 직접 의존이 아니므로 반드시 공유 패키지 @chuno/date 경유로 가져온다.
// (dist가 CJS라 Rollup이 default export를 정적 추적하지 못하므로 named import를 사용한다.)
import { dayjs } from "@chuno/date";
import { StatusTag } from "../components/StatusTag";
import { FitTable } from "../components/FitTable";
import {
  activateAgreement,
  createAgreement,
  getAgreement,
  listAgreements,
  updateAgreement,
} from "../api/agreements";
import type { UpdateAgreementInput } from "../api/agreements";
import { ApiError } from "../api/client";
import type { Agreement, AgreementType } from "../mock/types";

const { Title, Text, Paragraph } = Typography;

// antd DatePicker(값 타입은 Dayjs)와 mock state의 문자열 사이 변환을 담당한다.
type Dayjs = ReturnType<typeof dayjs>;

const DATE_FORMAT = "YYYY-MM-DD";

// mock state는 계속 `YYYY-MM-DD` 문자열로 저장하므로, 표시 계층에서만 Dayjs로 변환한다.
// Form.Item에 붙여 저장 값은 문자열로 유지하면서 DatePicker에는 Dayjs를 넘긴다.
const dateFieldValueProps = (value?: string) => ({
  value: value ? dayjs(value) : null,
});
const normalizeDate = (value: Dayjs | null) =>
  value ? value.format(DATE_FORMAT) : "";

// 약관 유형 → 한국어 표시 라벨. (표·상세·셀렉트·확인 다이얼로그 등 유형 노출 지점에 공통 사용)
const TYPE_LABELS: Record<AgreementType, string> = {
  service: "서비스 이용",
  privacy: "개인 정보",
  location: "위치 정보 수집",
  marketing: "마케팅 동의",
};

const typeLabel = (type: AgreementType) => TYPE_LABELS[type] ?? type;

const TYPE_OPTIONS = (Object.keys(TYPE_LABELS) as AgreementType[]).map((value) => ({
  value,
  label: TYPE_LABELS[value],
}));

interface NewAgreementForm {
  type: AgreementType;
  version: string;
  required: boolean;
  effectiveDate: string;
  body: string;
}

// 서버 version 검증(@Matches)과 동일: 숫자와 점으로만 구성. (예: 1, 1.0, 1.2.3)
const VERSION_PATTERN = /^\d+(\.\d+)*$/;

interface EditAgreementForm {
  effectiveDate: string;
  body: string;
}

// 약관 본문을 개행 그대로 보여주는 스크롤 박스.
const docBoxStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  maxHeight: 220,
  overflow: "auto",
  border: "1px solid var(--ant-color-border, #d9d9d9)",
  borderRadius: 8,
  padding: 12,
  fontSize: 13,
  lineHeight: 1.7,
  margin: 0,
};

export function AgreementPage() {
  const { modal, message } = App.useApp();
  // 목록·상세·등록·수정·활성화 모두 core-api 실연동. rows는 목록 조회(GET /admins/agreements) 결과다.
  const [rows, setRows] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAgreements = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    return listAgreements(signal)
      .then((items) => {
        setRows(items);
      })
      .catch((err) => {
        if (signal?.aborted) return;
        const messageText =
          err instanceof ApiError ? err.message : "약관 목록을 불러오지 못했습니다.";
        setLoadError(messageText);
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadAgreements(controller.signal);
    return () => controller.abort();
  }, [loadAgreements]);

  // 새 버전 등록 모달
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<NewAgreementForm>();

  // 상세 보기 / 수정 모달
  // 상세는 목록 row가 아니라 GET /admins/agreements/:id 응답을 기준으로 렌더한다.
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Agreement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm] = Form.useForm<EditAgreementForm>();
  // 열려 있는 상세 조회를 취소하기 위한 컨트롤러. (닫기·다른 항목 열기 시 이전 요청 중단)
  const detailAbortRef = useRef<AbortController | null>(null);

  const openView = (record: Agreement) => {
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;

    setViewingId(record.id);
    setEditing(false);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    getAgreement(record.id, controller.signal)
      .then((agreement) => {
        if (controller.signal.aborted) return;
        setDetail(agreement);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const messageText =
          err instanceof ApiError ? err.message : "약관 상세를 불러오지 못했습니다.";
        setDetailError(messageText);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
  };

  // 상세를 조용히 재조회한다. (수정 저장 후 최신화용 — 스피너로 모달을 비우지 않는다.)
  const refreshDetail = (id: number) => {
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;
    return getAgreement(id, controller.signal)
      .then((agreement) => {
        if (!controller.signal.aborted) setDetail(agreement);
      })
      .catch(() => {
        // 재조회 실패는 치명적이지 않으므로 조용히 무시한다. (목록 재조회로 보완)
      });
  };

  const closeView = () => {
    detailAbortRef.current?.abort();
    detailAbortRef.current = null;
    setViewingId(null);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
    setEditing(false);
  };

  const startEdit = () => {
    if (!detail) return;
    editForm.setFieldsValue({
      effectiveDate: detail.effectiveDate,
      body: detail.body ?? "",
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!detail) return;
    const target = detail;
    editForm.validateFields().then(async (values) => {
      // 수정 실연동(PUT /admins/agreements/:id): 원본 대비 바뀐 필드만 patch로 전송한다.
      // 대기중(pending) 약관만 수정 가능하므로 본문·시행일 모두 편집 대상이다.
      const patch: UpdateAgreementInput = {};
      if ((values.body ?? "") !== (target.body ?? "")) patch.content = values.body;
      if (values.effectiveDate !== target.effectiveDate)
        patch.expectedActivatedOn = values.effectiveDate;

      if (Object.keys(patch).length === 0) {
        message.info("변경된 내용이 없습니다.");
        setEditing(false);
        return;
      }

      setSaving(true);
      try {
        await updateAgreement(target.id, patch);
        message.success(`${typeLabel(target.type)} ${target.version} 약관을 수정했습니다.`);
        setEditing(false);
        // 서버 반영분을 다시 읽어 상세·목록을 최신화한다.
        await Promise.all([refreshDetail(target.id), loadAgreements()]);
      } catch (err) {
        const messageText =
          err instanceof ApiError ? err.message : "약관 수정에 실패했습니다.";
        message.error(messageText);
      } finally {
        setSaving(false);
      }
    });
  };

  const activate = (target: Agreement) => {
    // 활성화 실연동(PUT /admins/agreements/:id/active): 대상 pending → active,
    // 같은 type의 기존 active → archived 로 서버가 원자적으로 전이한다.
    // 약관은 시행일에 스케줄러가 자동 활성화한다. 여기서는 "수동 활성화"이므로 확인 다이얼로그로 진행한다.
    modal.confirm({
      title: `${typeLabel(target.type)} ${target.version} 을(를) 지금 수동으로 활성화할까요?`,
      content:
        "이 약관은 시행일에 자동 활성화됩니다. 지금 수동으로 활성화하면 같은 유형의 기존 활성(active) 버전은 보관(archived) 처리되어 타입당 active 버전 1개가 유지됩니다.",
      okText: "활성화",
      cancelText: "취소",
      onOk: async () => {
        try {
          await activateAgreement(target.id);
          message.success(`${typeLabel(target.type)} ${target.version} 버전을 활성화했습니다.`);
          // 서버 반영분(대상 + 기존 active 전이)을 다시 읽어 목록을 최신화한다.
          await loadAgreements();
          // 같은 약관 상세가 열려 있으면 상세도 최신화한다.
          if (viewingId === target.id) await refreshDetail(target.id);
        } catch (err) {
          const messageText =
            err instanceof ApiError ? err.message : "약관 활성화에 실패했습니다.";
          message.error(messageText);
          // confirm 이 자동으로 닫히지 않도록 에러를 다시 던진다. (다른 실연동 핸들러와 동일 패턴)
          throw err;
        }
      },
    });
  };

  const submitCreate = () => {
    // 등록만 실연동: 서버(POST /admins/agreements)에 생성 후 목록을 재조회한다.
    // title은 별도 입력 없이 유형의 한글 라벨로 자동 설정한다.
    createForm.validateFields().then(async (values) => {
      setCreating(true);
      try {
        await createAgreement({
          type: values.type,
          version: values.version,
          required: values.required,
          title: typeLabel(values.type),
          content: values.body,
          expectedActivatedOn: values.effectiveDate,
        });
        message.success("새 약관 버전을 등록했습니다. (대기)");
        createForm.resetFields();
        setCreateOpen(false);
        // 서버가 부여한 새 pending 행을 반영하기 위해 목록을 다시 불러온다.
        await loadAgreements();
      } catch (err) {
        const messageText =
          err instanceof ApiError ? err.message : "약관 등록에 실패했습니다.";
        message.error(messageText);
      } finally {
        setCreating(false);
      }
    });
  };

  const columns: ColumnsType<Agreement> = [
    {
      title: "유형",
      dataIndex: "type",
      key: "type",
      render: (type: AgreementType) => typeLabel(type),
    },
    { title: "버전", dataIndex: "version", key: "version" },
    {
      title: "필수 여부",
      dataIndex: "required",
      key: "required",
      // 색 점 + 한글: 필수는 강조(빨강), 선택은 파란계열(무채색 점은 화면에서 잘 안 보임).
      render: (required: boolean) =>
        required ? <Badge color="red" text="필수" /> : <Badge color="blue" text="선택" />,
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (s: string) => <StatusTag status={s} kind="agreement" />,
    },
    { title: "시행일", dataIndex: "effectiveDate", key: "effectiveDate" },
    {
      title: "작업",
      key: "action",
      width: 140,
      align: "right",
      render: (_, record) => (
        <Space size={6}>
          <Button size="small" onClick={() => openView(record)}>
            보기
          </Button>
          {record.status === "pending" && (
            <Button size="small" type="primary" onClick={() => activate(record)}>
              활성화
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-column">
      <Title level={4} style={{ margin: 0 }}>
        약관 관리
      </Title>

      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          타입당 활성(active) 버전은 1개만 유지됩니다. 새 버전 활성화 시 이전 버전은 만료(archived)
          처리되며, 활성화는 대기중(pending) 버전에만 가능합니다.
        </Text>
        <Button type="primary" onClick={() => setCreateOpen(true)} disabled={loading}>
          + 새 버전 등록
        </Button>
      </div>

      {loadError && (
        <Alert
          type="error"
          showIcon
          message="약관 목록을 불러오지 못했습니다."
          description={loadError}
          action={
            <Button size="small" onClick={() => loadAgreements()} loading={loading}>
              다시 시도
            </Button>
          }
        />
      )}

      <Card className="page-fill" styles={{ body: { padding: 0 } }}>
        <FitTable<Agreement>
          columns={columns}
          dataSource={rows}
          rowKey="id"
          pagination={false}
          loading={loading}
        />
      </Card>

      {/* 상세 보기 / 수정 */}
      <Modal
        title={detail ? `${typeLabel(detail.type)} ${detail.version}` : "약관 상세"}
        open={viewingId !== null}
        onCancel={closeView}
        destroyOnHidden
        footer={
          // 상세 로딩 실패/조회 중에는 닫기만 노출한다.
          !detail ? (
            <Button onClick={closeView}>닫기</Button>
          ) : editing ? (
            <Space>
              <Button onClick={() => setEditing(false)} disabled={saving}>
                취소
              </Button>
              <Button type="primary" onClick={saveEdit} loading={saving}>
                저장
              </Button>
            </Space>
          ) : (
            <Space>
              <Button onClick={closeView}>닫기</Button>
              {/* 수정은 대기중(pending) 약관에서만 가능하다. (서버 규칙과 일치) */}
              {detail.status === "pending" && (
                <Button type="primary" onClick={startEdit}>
                  수정
                </Button>
              )}
            </Space>
          )
        }
      >
        {detailLoading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "32px 0" }}>
            <Spin />
          </div>
        )}

        {!detailLoading && detailError && (
          <Alert type="error" showIcon message="약관 상세를 불러오지 못했습니다." description={detailError} />
        )}

        {!detailLoading && !detailError && detail && (
          <Form form={editForm} component={false}>
            <Descriptions
              column={1}
              size="small"
              styles={{ label: { width: 80 } }}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="유형">{typeLabel(detail.type)}</Descriptions.Item>
              <Descriptions.Item label="버전">{detail.version}</Descriptions.Item>
              <Descriptions.Item label="상태">
                <StatusTag status={detail.status} kind="agreement" />
              </Descriptions.Item>
              <Descriptions.Item label="필수 여부">
                {detail.required ? "필수" : "선택"}
              </Descriptions.Item>
              <Descriptions.Item label="시행일">
                {/* 수정 모드는 pending 전용이므로 시행일도 항상 편집 가능하다. */}
                {editing ? (
                  <>
                    <Form.Item
                      name="effectiveDate"
                      noStyle
                      getValueProps={dateFieldValueProps}
                      normalize={normalizeDate}
                      rules={[{ required: true, message: "시행일을 입력하세요" }]}
                    >
                      <DatePicker format={DATE_FORMAT} style={{ maxWidth: 160 }} />
                    </Form.Item>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      시행 예정일은 미래 날짜여야 합니다.
                    </Text>
                  </>
                ) : (
                  detail.effectiveDate
                )}
              </Descriptions.Item>
            </Descriptions>

            <Text type="secondary" style={{ fontSize: 12 }}>
              약관 본문
            </Text>
            {editing ? (
              <Form.Item
                name="body"
                style={{ marginTop: 6, marginBottom: 0 }}
                rules={[{ required: true, message: "약관 본문을 입력하세요" }]}
              >
                <Input.TextArea rows={8} />
              </Form.Item>
            ) : (
              <Paragraph style={{ ...docBoxStyle, marginTop: 6 }}>
                {detail.body ?? "본문 없음"}
              </Paragraph>
            )}
          </Form>
        )}
      </Modal>

      {/* 새 버전 등록 */}
      <Modal
        title="새 약관 버전 등록"
        open={createOpen}
        onOk={submitCreate}
        onCancel={() => setCreateOpen(false)}
        okText="등록(대기)"
        cancelText="취소"
        confirmLoading={creating}
        maskClosable={!creating}
        destroyOnHidden
      >
        <Form<NewAgreementForm>
          form={createForm}
          layout="vertical"
          initialValues={{ type: "service", required: true }}
        >
          <Form.Item label="유형" name="type" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            label="버전"
            name="version"
            rules={[
              { required: true, message: "버전을 입력하세요" },
              {
                pattern: VERSION_PATTERN,
                message: "숫자와 점(.)만, 예: 1.0, 1.2.3",
              },
            ]}
          >
            <Input placeholder="예: 1.2" />
          </Form.Item>
          <Form.Item label="필수 여부" name="required" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value={true}>필수</Radio>
              <Radio value={false}>선택</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            label="시행 예정일"
            name="effectiveDate"
            getValueProps={dateFieldValueProps}
            normalize={normalizeDate}
            rules={[{ required: true, message: "시행 예정일을 입력하세요" }]}
          >
            <DatePicker format={DATE_FORMAT} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="약관 본문"
            name="body"
            rules={[{ required: true, message: "약관 본문을 입력하세요" }]}
          >
            <Input.TextArea rows={4} placeholder="약관 본문" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
