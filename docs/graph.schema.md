# 문서 링크 그래프 계약 (`docs/graph.json`)

모든 기획 문서(기획서·와이어프레임·이슈·도메인·아키텍처) 사이의 관계를 담는 **단일 진실 원천**이다.
문서 간 상호 이동과 "기획 변경 시 사이드이펙트 자동 반영"의 근거가 된다.

각 생성 에이전트(planner / wireframer / issue-maker)는 문서를 저장할 때 이 파일을 **읽고 → 자기 노드·엣지를 병합 → 다시 쓴다**.
`plan-syncer`는 이 파일을 읽어 변경 영향 범위를 계산한다.

## 구조

```json
{
  "nodes": [
    { "id": "plan:notification",    "type": "plan",      "title": "알림 기능 기획",   "file": "plans/notification.html" },
    { "id": "domain:notification",  "type": "domain",    "title": "알림 도메인" },
    { "id": "feature:fcm-push",     "type": "feature",   "title": "FCM 푸시 발송",   "plan": "plan:notification" },
    { "id": "wireframe:notification","type": "wireframe","title": "알림 와이어프레임", "file": "wireframes/notification.html" },
    { "id": "issue:NOTI-1",         "type": "issue",     "title": "푸시 토큰 등록",   "file": "issues/notification.html",
      "priority": "P0", "size": "M" }
  ],
  "edges": [
    { "from": "issue:NOTI-1",      "to": "feature:fcm-push",    "rel": "implements" },
    { "from": "feature:fcm-push",  "to": "domain:notification", "rel": "belongs_to" },
    { "from": "issue:NOTI-2",      "to": "issue:NOTI-1",        "rel": "depends_on" },
    { "from": "wireframe:notification", "to": "feature:fcm-push","rel": "visualizes" },
    { "from": "plan:notification", "to": "domain:notification", "rel": "touches" }
  ]
}
```

## 규칙

- **노드 id:** `type:slug` 형식. 같은 대상은 항상 같은 id를 쓴다(중복 생성 금지, 이미 있으면 갱신).
- **type:** `plan` · `domain` · `feature` · `issue` · `wireframe` · `architecture`.
- **file:** `docs/` 기준 상대 경로(문서 파일이 있는 노드만). 도메인·기능 노드는 파일이 없을 수 있다.
- **status (선택 필드, `feature`·`issue` 노드용):** `active`(기본값, 생략 가능) 또는 `deferred`. `deferred`는 차기 마일스톤으로 연기되어 이번 범위에서는 보류 중이지만 노드·엣지를 삭제하지는 않은 상태를 뜻한다. `deferred` 노드도 그래프 순회·영향 계산 대상에는 계속 포함하되, 리포트나 화면 표시에서는 "이번 범위 아님 / 보류"로 구분해 보여준다.
- **엣지 rel(관계):**
  - `issue → feature` : `implements`
  - `feature → domain` : `belongs_to`
  - `issue → issue` : `depends_on` (선행 이슈를 to로)
  - `wireframe → feature` : `visualizes`
  - `plan → domain` : `touches`
  - `feature → plan` 는 노드의 `plan` 필드로 대신 표현한다.
- **병합 원칙:** 같은 id 노드/같은 (from,to,rel) 엣지는 덮어쓰되, 관계없는 기존 노드·엣지는 보존한다. 절대 전체를 날리지 않는다.
- 파일이 없으면 `{ "nodes": [], "edges": [] }` 로 새로 만든다.

## 그래프 순회 (plan-syncer용)

`plan:X`가 바뀌면 영향 범위는 다음으로 확장한다:
`plan:X` → (`touches`) 도메인 → (`belongs_to` 역방향) 기능 → (`plan` 필드가 X인) 기능 → (`implements` 역방향) 이슈 → (`visualizes` 역방향) 와이어프레임, 그리고 이슈 간 `depends_on` 체인.

`status: deferred`인 노드도 이 순회에서 제외하지 않는다 — 기획이 어떤 기능/이슈를 다음 마일스톤으로 미룰 때는 노드를 지우는 대신 `status`를 `deferred`로 바꾸고, 그 기능/이슈에 의존하던 다른(활성) 이슈의 `depends_on` 엣지만 끊어내는 것을 기본 처리로 한다.
