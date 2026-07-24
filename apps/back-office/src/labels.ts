// 백오피스 화면 표기(한글) 매핑.
import type {
  AgreementStatus,
  ParticipationStatus,
  Provider,
  RoomStatus,
  UserStatus,
} from "./types/domain";

export const PROVIDER_LABEL: Record<Provider, string> = {
  kakao: "카카오",
  google: "구글",
  apple: "애플",
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  active: "활성",
  suspended: "정지",
  onboarding: "온보딩",
  exited: "탈퇴",
};

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  recruiting: "모집 중",
  ready: "모집 마감",
  live: "진행 중",
  finished: "경기 종료",
  cancelled: "취소",
};

// 참가자 개인의 결과. 방의 finished("경기 종료")와 값이 겹치지만 뜻이 달라
// StatusTag 의 kind 로 구분한다.
export const PARTICIPATION_STATUS_LABEL: Record<ParticipationStatus, string> = {
  finished: "완주",
  dnf: "미완주",
  running: "달리는 중",
};

export const AGREEMENT_STATUS_LABEL: Record<AgreementStatus, string> = {
  active: "활성",
  archived: "만료",
  pending: "대기",
};

export const ADMIN_STATUS_LABEL: Record<string, string> = {
  active: "활성",
  disabled: "비활성",
};

// 부정행위 탐지 유형·조치 (2차).
export const CHEAT_TYPE_LABEL: Record<string, string> = {
  abnormalSpeed: "비정상 속도",
  spoofSuspected: "위치 조작 의심",
  timestampMismatch: "시각 불일치",
  impossibleFinish: "불가능한 완주",
};

export const CHEAT_ACTION_LABEL: Record<string, string> = {
  rejected: "보고 반려",
  voided: "기록 무효",
};
