import { useMemo, useState } from "react";
import {
  App,
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
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
// dayjs는 back-office 직접 의존이 아니므로 반드시 공유 패키지 @chuno/date 경유로 가져온다.
// (dist가 CJS라 Rollup이 default export를 정적 추적하지 못하므로 named import를 사용한다.)
import { dayjs } from "@chuno/date";
import { StatusTag } from "../components/StatusTag";
import { FitTable } from "../components/FitTable";
import { mockAgreements } from "../mock/agreements";
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

const TYPE_OPTIONS: { value: AgreementType; label: string }[] = [
  { value: "service", label: "service" },
  { value: "privacy", label: "privacy" },
  { value: "location", label: "location" },
  { value: "marketing", label: "marketing" },
];

interface NewAgreementForm {
  type: AgreementType;
  version: string;
  required: boolean;
  effectiveDate: string;
  body: string;
}

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
  const [rows, setRows] = useState<Agreement[]>(mockAgreements);

  // 새 버전 등록 모달
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<NewAgreementForm>();

  // 상세 보기 / 수정 모달
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm] = Form.useForm<EditAgreementForm>();

  const viewing = useMemo(
    () => rows.find((r) => r.id === viewingId) ?? null,
    [rows, viewingId],
  );
  const editablePending = viewing?.status === "pending";

  const openView = (record: Agreement) => {
    setViewingId(record.id);
    setEditing(false);
  };

  const closeView = () => {
    setViewingId(null);
    setEditing(false);
  };

  const startEdit = () => {
    if (!viewing) return;
    editForm.setFieldsValue({
      effectiveDate: viewing.effectiveDate,
      body: viewing.body ?? "",
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!viewing) return;
    editForm.validateFields().then((values) => {
      // 원본 대비 실제로 바뀐 값만 반영한다. (시행일은 대기중일 때만 편집 가능)
      const patch: Partial<Agreement> = {};
      if ((values.body ?? "") !== (viewing.body ?? "")) patch.body = values.body;
      if (editablePending && values.effectiveDate !== viewing.effectiveDate)
        patch.effectiveDate = values.effectiveDate;

      if (Object.keys(patch).length === 0) {
        message.info("변경된 내용이 없습니다.");
        setEditing(false);
        return;
      }

      setRows((prev) =>
        prev.map((r) => (r.id === viewing.id ? { ...r, ...patch } : r)),
      );
      message.success(`${viewing.type} ${viewing.version} 약관을 수정했습니다.`);
      setEditing(false);
    });
  };

  const activate = (target: Agreement) => {
    modal.confirm({
      title: `${target.type} ${target.version} 버전을 활성화할까요?`,
      content: "같은 유형의 기존 활성(active) 버전은 만료(archived) 처리됩니다.",
      okText: "활성화",
      cancelText: "취소",
      onOk: () => {
        setRows((prev) =>
          prev.map((r) => {
            if (r.id === target.id) return { ...r, status: "active" };
            // 같은 유형의 기존 active 버전 → archived
            if (r.type === target.type && r.status === "active")
              return { ...r, status: "archived" };
            return r;
          }),
        );
        message.success(`${target.type} ${target.version} 버전을 활성화했습니다.`);
      },
    });
  };

  const submitCreate = () => {
    createForm.validateFields().then((values) => {
      const nextId = Math.max(0, ...rows.map((r) => r.id)) + 1;
      setRows((prev) => [
        {
          id: nextId,
          type: values.type,
          version: values.version,
          required: values.required,
          status: "pending",
          effectiveDate: values.effectiveDate,
          body: values.body,
        },
        ...prev,
      ]);
      message.success("새 약관 버전을 등록했습니다. (대기)");
      createForm.resetFields();
      setCreateOpen(false);
    });
  };

  const columns: ColumnsType<Agreement> = [
    { title: "유형", dataIndex: "type", key: "type" },
    { title: "버전", dataIndex: "version", key: "version" },
    {
      title: "필수",
      dataIndex: "required",
      key: "required",
      render: (required: boolean) => (required ? "필수" : "선택"),
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
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          + 새 버전 등록
        </Button>
      </div>

      <Card className="page-fill" styles={{ body: { padding: 0 } }}>
        <FitTable<Agreement>
          columns={columns}
          dataSource={rows}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* 상세 보기 / 수정 */}
      <Modal
        title={viewing ? `${viewing.type} ${viewing.version}` : ""}
        open={viewing !== null}
        onCancel={closeView}
        destroyOnHidden
        footer={
          editing ? (
            <Space>
              <Button onClick={() => setEditing(false)}>취소</Button>
              <Button type="primary" onClick={saveEdit}>
                저장
              </Button>
            </Space>
          ) : (
            <Space>
              <Button onClick={closeView}>닫기</Button>
              <Button type="primary" onClick={startEdit}>
                수정
              </Button>
            </Space>
          )
        }
      >
        {viewing && (
          <Form form={editForm} component={false}>
            <Descriptions
              column={1}
              size="small"
              styles={{ label: { width: 80 } }}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="유형">{viewing.type}</Descriptions.Item>
              <Descriptions.Item label="버전">{viewing.version}</Descriptions.Item>
              <Descriptions.Item label="상태">
                <StatusTag status={viewing.status} kind="agreement" />
              </Descriptions.Item>
              <Descriptions.Item label="필수 여부">
                {viewing.required ? "필수" : "선택"}
              </Descriptions.Item>
              <Descriptions.Item label="시행일">
                {editing && editablePending ? (
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
                      대기중 약관은 시행일 변경 가능
                    </Text>
                  </>
                ) : (
                  <>
                    {viewing.effectiveDate}
                    {editing && (
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        (시행일은 대기중 약관만 변경 가능)
                      </Text>
                    )}
                  </>
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
                {viewing.body ?? "본문 없음"}
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
            rules={[{ required: true, message: "버전을 입력하세요" }]}
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
