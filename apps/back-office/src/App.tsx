import { Button, Layout, Space, Typography } from "antd";
import { DashboardOutlined } from "@ant-design/icons";

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export function App() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <DashboardOutlined style={{ color: "#fff", fontSize: 20 }} />
        <Text style={{ color: "#fff", fontSize: 16 }}>추노 백오피스</Text>
      </Header>
      <Content style={{ padding: 24 }}>
        <Title level={2}>추노 백오피스</Title>
        <Paragraph>
          React + Vite + TypeScript 스캐폴딩. 여기부터 관리 화면을 채워나간다.
        </Paragraph>
        <Space>
          <Button type="primary">기본 버튼</Button>
          <Button>보조 버튼</Button>
        </Space>
      </Content>
    </Layout>
  );
}
