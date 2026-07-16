import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import koKR from "antd/locale/ko_KR";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      locale={koKR}
      theme={{
        token: {
          colorPrimary: "#1677ff",
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
);
