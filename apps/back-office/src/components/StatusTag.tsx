import { Tag } from "antd";
import {
  ADMIN_STATUS_LABEL,
  AGREEMENT_STATUS_LABEL,
  PARTICIPATION_STATUS_LABEL,
  ROOM_STATUS_LABEL,
  USER_STATUS_LABEL,
} from "../labels";

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

// 상태 문자열 → 화면 표기(한글). 도메인마다 같은 값이 다른 뜻을 갖기 때문에
// (방 finished = "경기 종료" vs 참가 finished = "완주") kind 로 사전을 고른다.
const LABEL_MAPS = {
  user: USER_STATUS_LABEL,
  room: ROOM_STATUS_LABEL,
  participation: PARTICIPATION_STATUS_LABEL,
  agreement: AGREEMENT_STATUS_LABEL,
  admin: ADMIN_STATUS_LABEL,
} satisfies Record<string, Record<string, string>>;

export type StatusKind = keyof typeof LABEL_MAPS;

interface StatusTagProps {
  status: string;
  kind: StatusKind;
}

export function StatusTag({ status, kind }: StatusTagProps) {
  const label = (LABEL_MAPS[kind] as Record<string, string>)[status] ?? status;
  return <Tag color={COLOR_MAP[status] ?? "default"}>{label}</Tag>;
}
