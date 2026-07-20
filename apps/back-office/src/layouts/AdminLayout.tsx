import { Dropdown, Layout, Menu, Typography } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  FlagOutlined,
  FileTextOutlined,
  TeamOutlined,
  AppstoreOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  DownOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// 그룹(부모 SubMenu) 키. 리프 항목 키는 실제 이동 경로와 동일하게 둔다.
const GROUP_OPERATIONS = "group:operations";
const GROUP_POLICY = "group:policy";
const GROUP_SYSTEM = "group:system";

const NAV_ITEMS: MenuProps["items"] = [
  { key: "/", icon: <DashboardOutlined />, label: "대시보드" },
  {
    key: GROUP_OPERATIONS,
    icon: <AppstoreOutlined />,
    label: "운영",
    children: [
      { key: "/users", icon: <UserOutlined />, label: "사용자 관리" },
      { key: "/rooms", icon: <FlagOutlined />, label: "방(경주) 관리" },
    ],
  },
  {
    key: GROUP_POLICY,
    icon: <SafetyCertificateOutlined />,
    label: "정책",
    children: [{ key: "/agreements", icon: <FileTextOutlined />, label: "약관 관리" }],
  },
  {
    key: GROUP_SYSTEM,
    icon: <SettingOutlined />,
    label: "시스템",
    children: [{ key: "/admins", icon: <TeamOutlined />, label: "관리자 계정" }],
  },
];

// 세 그룹은 항상 펼친 상태로 두어 와이어프레임처럼 2단계가 보이게 한다.
const DEFAULT_OPEN_KEYS = [GROUP_OPERATIONS, GROUP_POLICY, GROUP_SYSTEM];

// 최상위 경로 세그먼트로 선택 리프 메뉴를 계산한다. (상세 화면에서도 부모 리프 유지)
function selectedKey(pathname: string): string {
  if (pathname.startsWith("/users")) return "/users";
  if (pathname.startsWith("/rooms")) return "/rooms";
  if (pathname.startsWith("/agreements")) return "/agreements";
  if (pathname.startsWith("/admins")) return "/admins";
  return "/";
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAuth();

  const userMenu: MenuProps["items"] = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "로그아웃",
      onClick: () => {
        // 토큰 폐기 후 로그인으로.
        logout();
        navigate("/login", { replace: true });
      },
    },
  ];

  return (
    // 페이지 전체 스크롤 없음 — 뷰포트 높이에 고정하고, 넘치는 건 내부 영역이 스크롤한다.
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        theme="light"
        width={200}
        style={{ borderRight: "1px solid #f0f0f0", overflow: "auto" }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            padding: "18px 20px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          추노 백오피스
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey(location.pathname)]}
          defaultOpenKeys={DEFAULT_OPEN_KEYS}
          items={NAV_ITEMS}
          style={{ borderInlineEnd: "none" }}
          onClick={({ key }) => {
            // 그룹(SubMenu) 헤더 클릭은 펼침/접힘만 담당하므로 이동하지 않는다.
            if (key.startsWith("group:")) return;
            navigate(key);
          }}
        />
      </Sider>
      <Layout style={{ minWidth: 0 }}>
        <Header
          style={{
            background: "#fff",
            borderBottom: "1px solid #f0f0f0",
            padding: "0 24px",
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <Dropdown menu={{ items: userMenu }} trigger={["click"]}>
            <Text style={{ cursor: "pointer" }}>
              {admin?.email ?? "관리자"} <DownOutlined style={{ fontSize: 10 }} />
            </Text>
          </Dropdown>
        </Header>
        {/* 각 페이지는 이 flex 컬럼 안에서 높이를 나눠 갖는다. */}
        <Content
          style={{
            padding: 24,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
