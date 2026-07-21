import type { Agreement } from "./types";

// 약관 본문은 여러 조항으로 이뤄지므로 개행을 포함해 시드한다.
// (상세 다이얼로그에서 white-space: pre-wrap 으로 그대로 렌더된다.)
const SERVICE_1_1 = `제1조 (목적)
본 약관은 추노 서비스 이용에 관한 조건 및 절차를 규정합니다.

제2조 (정의)
"서비스"란 회사가 제공하는 러닝 경주 관련 일체의 기능을 의미합니다.

제3조 (약관의 효력 및 변경)
본 약관은 시행일부터 효력이 발생하며, 변경 시 사전 공지합니다.`;

const SERVICE_1_0 = `제1조 (목적)
본 약관은 추노 서비스 이용에 관한 조건을 규정합니다. (구버전)

제2조 (정의)
"서비스"란 회사가 제공하는 러닝 관련 기능을 의미합니다.`;

const PRIVACY_1_0 = `1. 수집하는 개인정보 항목
닉네임, 소셜 로그인 식별자, 위치정보를 수집합니다.

2. 개인정보의 이용 목적
서비스 제공, 경주 기록 관리, 고객 문의 대응에 이용합니다.

3. 개인정보의 보유 기간
회원 탈퇴 시까지 보유하며, 관련 법령에 따라 예외를 둡니다.`;

const LOCATION_1_0 = `1. 위치정보 수집 목적
경주 진행 중 실시간 거리·페이스 측정을 위해 위치정보를 수집합니다.

2. 위치정보 이용 및 보유
경주 종료 후 기록 산출에 이용하며, 통계 목적 외 별도 보관하지 않습니다.`;

const MARKETING_2_0 = `1. 마케팅 정보 수신 동의 (선택)
이벤트, 신규 기능, 혜택 등 마케팅 정보를 알림/이메일로 수신합니다.

2. 철회
동의는 언제든 설정에서 철회할 수 있으며, 철회 시 마케팅 발송이 중단됩니다.`;

export const mockAgreements: Agreement[] = [
  {
    id: 1,
    type: "service",
    version: "1.1",
    required: true,
    status: "active",
    effectiveDate: "2026-05-01",
    body: SERVICE_1_1,
  },
  {
    id: 2,
    type: "service",
    version: "1.0",
    required: true,
    status: "archived",
    effectiveDate: "2026-01-01",
    body: SERVICE_1_0,
  },
  {
    id: 3,
    type: "privacy",
    version: "1.0",
    required: true,
    status: "active",
    effectiveDate: "2026-01-01",
    body: PRIVACY_1_0,
  },
  {
    id: 4,
    type: "location",
    version: "1.0",
    required: true,
    status: "active",
    effectiveDate: "2026-01-01",
    body: LOCATION_1_0,
  },
  {
    id: 5,
    type: "marketing",
    version: "2.0",
    required: false,
    status: "pending",
    effectiveDate: "2026-08-01",
    body: MARKETING_2_0,
  },
];
