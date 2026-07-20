import { useState } from "react";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { StatusTag } from "../components/StatusTag";
import { FitTable } from "../components/FitTable";
import { mockAgreements } from "../mock/agreements";
import type { Agreement, AgreementType } from "../mock/types";

const { Title, Text } = Typography;

const TYPE_OPTIONS: { value: AgreementType; label: string }[] = [
  { value: "service", label: "service" },
  { value: "privacy", label: "privacy" },
  { value: "location", label: "location" },
  { value: "marketing", label: "marketing" },
];

interface NewAgreementForm {
  type: AgreementType;
  version: string;
  effectiveDate: string;
  body: string;
}

export function AgreementPage() {
  const { modal, message } = App.useApp();
  const [rows, setRows] = useState<Agreement[]>(mockAgreements);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<NewAgreementForm>();

  const activate = (target: Agreement) => {
    modal.confirm({
      title: `${target.type} ${target.version} 버전을 활성화할까요?`,
      content: "같은 유형의 기존 활성 버전은 만료 처리됩니다.",
      okText: "활성화",
      cancelText: "취소",
      onOk: () => {
        setRows((prev) =>
          prev.map((r) => {
            if (r.id === target.id) return { ...r, status: "active" };
            // 같은 유형의 기존 active 버전은 archived 처리
            if (r.type === target.type && r.status === "active")
              return { ...r, status: "archived" };
            return r;
          }),
        );
        message.success(`${target.type} ${target.version} 버전을 활성화했습니다.`);
      },
    });
  };

  const submit = () => {
    form.validateFields().then((values) => {
      const nextId = Math.max(...rows.map((r) => r.id)) + 1;
      setRows((prev) => [
        {
          id: nextId,
          type: values.type,
          version: values.version,
          required: values.type !== "marketing",
          status: "pending",
          effectiveDate: values.effectiveDate,
          body: values.body,
        },
        ...prev,
      ]);
      message.success("새 약관 버전을 등록했습니다. (대기)");
      form.resetFields();
      setOpen(false);
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
      title: "",
      key: "action",
      width: 100,
      render: (_, record) =>
        record.status === "pending" ? (
          <Button size="small" type="primary" onClick={() => activate(record)}>
            활성화
          </Button>
        ) : (
          <Button
            size="small"
            onClick={() =>
              modal.info({
                title: `${record.type} ${record.version}`,
                content: record.body ?? "본문 없음",
                okText: "닫기",
              })
            }
          >
            보기
          </Button>
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
          타입당 활성 버전은 1개만 유지됩니다. 새 버전 활성화 시 이전 버전은 만료 처리됩니다.
        </Text>
        <Button type="primary" onClick={() => setOpen(true)}>
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

      <Modal
        title="새 약관 버전 등록"
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        okText="등록(대기)"
        cancelText="취소"
        destroyOnHidden
      >
        <Form<NewAgreementForm>
          form={form}
          layout="vertical"
          initialValues={{ type: "service" }}
        >
          <Form.Item label="유형" name="type" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item label="버전" name="version" rules={[{ required: true, message: "버전을 입력하세요" }]}>
            <Input placeholder="예: 1.2" />
          </Form.Item>
          <Form.Item
            label="시행 예정일"
            name="effectiveDate"
            rules={[{ required: true, message: "시행 예정일을 입력하세요" }]}
          >
            <Input placeholder="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item label="약관 본문" name="body">
            <Input.TextArea rows={4} placeholder="약관 본문" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
