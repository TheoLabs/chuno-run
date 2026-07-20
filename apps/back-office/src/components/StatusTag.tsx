import { Tag } from "antd";

// 상태 문자열 → antd Tag 색상 매핑. 백오피스 전역에서 재사용한다.
const COLOR_MAP: Record<string, string> = {
  // 사용자
  active: "green",
  suspended: "red",
  onboarding: "blue",
  exited: "default",
  // 방
  recruiting: "blue",
  ready: "gold",
  live: "green",
  finished: "default",
  cancelled: "red",
  // 참가/결과
  running: "processing",
  dnf: "red",
  // 약관
  archived: "default",
  pending: "gold",
  // 관리자 계정
  disabled: "default",
};

interface StatusTagProps {
  status: string;
}

export function StatusTag({ status }: StatusTagProps) {
  return <Tag color={COLOR_MAP[status] ?? "default"}>{status}</Tag>;
}
