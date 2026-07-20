import type { Agreement } from "./types";

export const mockAgreements: Agreement[] = [
  {
    id: 1,
    type: "service",
    version: "1.1",
    required: true,
    status: "active",
    effectiveDate: "2026-05-01",
    body: "제1조(목적) 본 약관은 추노 서비스 이용에 관한 조건을 규정합니다. ...",
  },
  {
    id: 2,
    type: "service",
    version: "1.0",
    required: true,
    status: "archived",
    effectiveDate: "2026-01-01",
    body: "제1조(목적) 본 약관은 추노 서비스 이용에 관한 조건을 규정합니다. (구버전) ...",
  },
  {
    id: 3,
    type: "privacy",
    version: "1.0",
    required: true,
    status: "active",
    effectiveDate: "2026-01-01",
    body: "개인정보 처리방침 ...",
  },
  {
    id: 4,
    type: "location",
    version: "1.0",
    required: true,
    status: "active",
    effectiveDate: "2026-01-01",
    body: "위치기반 서비스 이용약관 ...",
  },
  {
    id: 5,
    type: "marketing",
    version: "2.0",
    required: false,
    status: "pending",
    effectiveDate: "2026-08-01",
    body: "마케팅 정보 수신 동의 ...",
  },
];
