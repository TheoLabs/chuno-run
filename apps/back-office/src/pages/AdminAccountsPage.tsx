import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Form, Input, Modal, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { StatusTag } from "../components/StatusTag";
import { FitTable } from "../components/FitTable";
import {
  activateAdmin,
  createAdmin,
  disableAdmin,
  listAdmins,
  type AdminAccountItem,
} from "../api/admins";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const { Title, Text } = Typography;

interface NewAdminForm {
  email: string;
  name?: string;
}

export function AdminAccountsPage() {
  const { modal, message } = App.useApp();
  const { admin: me } = useAuth();

  const [rows, setRows] = useState<AdminAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<NewAdminForm>();

  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);

      return listAdmins({ page: 1, limit: 100 }, signal)
        .then((data) => {
          setRows(data.items);
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
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /**
   * 활성 ↔ 비활성 전환.
   * 자기 자신과 마지막 활성 관리자는 서버가 400으로 막는다 — 백오피스가 잠기는 걸 막기 위해서다.
   */
  const toggleStatus = (target: AdminAccountItem) => {
    const next = target.status === "active" ? "disabled" : "active";
    const label = target.name ?? target.email;

    modal.confirm({
      title: `${label} 계정을 ${next === "disabled" ? "비활성" : "활성"}할까요?`,
      content:
        next === "disabled"
          ? "비활성화하면 해당 관리자는 로그인할 수 없습니다."
          : "활성화하면 해당 관리자가 다시 로그인할 수 있습니다.",
      okText: next === "disabled" ? "비활성" : "활성",
      okButtonProps: { danger: next === "disabled" },
      cancelText: "취소",
      onOk: async () => {
        try {
          await (next === "disabled" ? disableAdmin(target.id) : activateAdmin(target.id));
          await load();
          message.success(`${label} 계정을 ${next === "disabled" ? "비활성" : "활성"}했습니다.`);
        } catch (e: unknown) {
          message.error(e instanceof ApiError ? e.message : "상태를 변경하지 못했습니다.");
        }
      },
    });
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);

    try {
      await createAdmin(values.email, values.name);
      await load();
      message.success("관리자를 추가했습니다.");
      form.resetFields();
      setOpen(false);
    } catch (e: unknown) {
      message.error(e instanceof ApiError ? e.message : "관리자를 추가하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<AdminAccountItem> = [
    { title: "이메일", dataIndex: "email", key: "email" },
    {
      title: "이름",
      dataIndex: "name",
      key: "name",
      // 이름은 첫 구글 로그인 때 채워진다 — 사전 등록 직후에는 비어 있다.
      render: (name: string | null) => name ?? "(미로그인)",
    },
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
        record.id === me?.id ? (
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

      {error && <Alert type="error" message={error} showIcon />}

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
        <FitTable<AdminAccountItem>
          columns={columns}
          dataSource={rows}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title="관리자 추가"
        open={open}
        onOk={submit}
        confirmLoading={submitting}
        onCancel={() => setOpen(false)}
        okText="추가"
        cancelText="취소"
        destroyOnHidden
      >
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 16 }}>
          추가한 구글 계정 이메일이 로그인 허용 대상이 됩니다. (비밀번호 없음 — 구글 로그인)
          이름은 첫 로그인 시 구글 계정에서 자동으로 채워집니다.
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
          <Form.Item label="이름 (선택)" name="name">
            <Input placeholder="비워두면 첫 로그인 시 구글 계정 이름으로 채워집니다" autoComplete="off" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
