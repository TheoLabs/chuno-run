import { useState } from "react";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { StatusTag } from "../components/StatusTag";
import { FitTable } from "../components/FitTable";
import { mockAdminAccounts } from "../mock/admins";
import type { AdminAccount } from "../mock/types";

const { Title, Text } = Typography;

interface NewAdminForm {
  email: string;
  name: string;
}

export function AdminAccountsPage() {
  const { modal, message } = App.useApp();
  const [rows, setRows] = useState<AdminAccount[]>(mockAdminAccounts);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<NewAdminForm>();

  const toggleStatus = (target: AdminAccount) => {
    const next = target.status === "active" ? "disabled" : "active";
    modal.confirm({
      title: `${target.name} 계정을 ${next === "disabled" ? "비활성" : "활성"}할까요?`,
      content:
        next === "disabled"
          ? "비활성화하면 해당 관리자는 로그인할 수 없습니다."
          : "활성화하면 해당 관리자가 다시 로그인할 수 있습니다.",
      okText: next === "disabled" ? "비활성" : "활성",
      okButtonProps: { danger: next === "disabled" },
      cancelText: "취소",
      onOk: () => {
        setRows((prev) =>
          prev.map((r) => (r.id === target.id ? { ...r, status: next } : r)),
        );
        message.success(`${target.name} 계정을 ${next === "disabled" ? "비활성" : "활성"}했습니다.`);
      },
    });
  };

  const submit = () => {
    form.validateFields().then((values) => {
      const nextId = Math.max(...rows.map((r) => r.id)) + 1;
      setRows((prev) => [
        ...prev,
        {
          id: nextId,
          email: values.email,
          name: values.name,
          status: "active",
          createdAt: new Date().toISOString().slice(0, 10),
        },
      ]);
      message.success("관리자를 추가했습니다.");
      form.resetFields();
      setOpen(false);
    });
  };

  const columns: ColumnsType<AdminAccount> = [
    { title: "이메일", dataIndex: "email", key: "email" },
    { title: "이름", dataIndex: "name", key: "name" },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (s: string) => <StatusTag status={s} kind="admin" />,
    },
    { title: "생성일", dataIndex: "createdAt", key: "createdAt" },
    {
      title: "",
      key: "action",
      width: 100,
      render: (_, record) =>
        record.self ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            본인
          </Text>
        ) : record.status === "active" ? (
          <Button size="small" danger onClick={() => toggleStatus(record)}>
            비활성
          </Button>
        ) : (
          <Button size="small" onClick={() => toggleStatus(record)}>
            활성
          </Button>
        ),
    },
  ];

  return (
    <div className="page-column">
      <Title level={4} style={{ margin: 0 }}>
        관리자 계정 관리
      </Title>

      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          1차는 단일 역할 — 모든 관리자가 동일 권한. 구글 로그인 전용(추가 = 구글 계정 이메일 등록).
        </Text>
        <Button type="primary" onClick={() => setOpen(true)}>
          + 관리자 추가
        </Button>
      </div>

      <Card className="page-fill" styles={{ body: { padding: 0 } }}>
        <FitTable<AdminAccount>
          columns={columns}
          dataSource={rows}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title="관리자 추가"
        open={open}
        onOk={submit}
        onCancel={() => setOpen(false)}
        okText="추가"
        cancelText="취소"
        destroyOnHidden
      >
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 16 }}>
          추가한 구글 계정 이메일이 로그인 허용 대상이 됩니다. (비밀번호 없음 — 구글 로그인)
        </Text>
        <Form<NewAdminForm> form={form} layout="vertical">
          <Form.Item
            label="구글 계정 이메일"
            name="email"
            rules={[
              { required: true, message: "구글 계정 이메일을 입력하세요" },
              { type: "email", message: "이메일 형식이 아닙니다" },
            ]}
          >
            <Input placeholder="ops@chuno.run" autoComplete="off" />
          </Form.Item>
          <Form.Item label="이름" name="name" rules={[{ required: true, message: "이름을 입력하세요" }]}>
            <Input placeholder="이름" autoComplete="off" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
