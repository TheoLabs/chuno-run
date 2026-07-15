# chuno-run (추노)

장소에 구애받지 않고 실시간 GPS로 경쟁하는 러닝 앱. Turborepo 기반 모노레포.

## 구성

```
apps/
  core-api/      NestJS 백엔드 API
  mobile/        Flutter 앱 (Android/iOS)  ← package.json 래퍼로 turbo 연동
  back-office/   React + Vite + TS 백오피스
packages/
  tsconfig/      공용 TypeScript 설정 프리셋
  eslint-config/ 공용 ESLint(flat) 설정
```

- 패키지 매니저: **pnpm**
- 오케스트레이션: **Turborepo**

## 시작하기

```bash
pnpm install              # 워크스페이스 의존성 설치

# Flutter 플랫폼 스캐폴딩(android/ios) 최초 1회 생성
pnpm --filter @chuno/mobile gen

# 모바일: 저장 시 자동 hot reload / restart (apps/mobile/tools/watch_run.sh)
pnpm --filter @chuno/mobile dev      # 또는  pnpm app:watch
#   - lib/*.dart 저장 → hot reload 시도
#   - flutter가 리로드를 거부(const/구조 변경)하면 출력 감지 후 자동 hot restart
#   - 원본 실행: pnpm --filter @chuno/mobile run   (또는  pnpm app:run)

# 전체 태스크
pnpm dev                  # 모든 앱 개발 서버
pnpm build                # 전체 빌드
pnpm lint                 # 전체 린트
pnpm typecheck            # 타입 체크
pnpm test                 # 테스트
```

개별 앱만 실행하려면 `pnpm --filter @chuno/core-api dev` 처럼 `--filter`를 쓴다.

## 이벤트 파이프라인 (Outbox → CDC → Kafka)

도메인 이벤트는 트랜잭셔널 아웃박스(`ddd_event` 테이블)에 적재되고, Debezium이 MySQL
binlog를 테일링해 Kafka로 전파한다. 로컬 인프라(mysql, kafka, kafka-ui, debezium, redis 등)는
도커로 이미 떠 있다고 가정한다. Kafka UI: http://localhost:8080

### Debezium 커넥터 등록 (최초 1회)

`ddd_event` 아웃박스를 CDC로 캡처하는 커넥터를 Connect REST(:8083)에 등록한다.

```bash
curl -s -X POST http://localhost:8083/connectors -H 'Content-Type: application/json' -d '{
  "name": "chuno-outbox-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "root",
    "database.password": "1234",
    "database.server.id": "184054",
    "topic.prefix": "chuno",
    "database.include.list": "chuno_run",
    "table.include.list": "chuno_run.ddd_event",
    "schema.history.internal.kafka.bootstrap.servers": "kafka:29092",
    "schema.history.internal.kafka.topic": "schema-history.chuno",
    "snapshot.mode": "initial",
    "key.converter": "org.apache.kafka.connect.json.JsonConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter",
    "key.converter.schemas.enable": "false",
    "value.converter.schemas.enable": "false"
  }
}'
```

상태 확인 / 삭제:

```bash
curl -s http://localhost:8083/connectors/chuno-outbox-connector/status   # connector·task가 RUNNING이면 정상
curl -s -X DELETE http://localhost:8083/connectors/chuno-outbox-connector
```

- 이벤트가 흐르는 토픽: `chuno.chuno_run.ddd_event` (첫 INSERT 시 자동 생성)
- 테이블이 비어 있으면 토픽에 아무것도 안 흐른다 — 도메인이 `publishEvent`로 아웃박스에
  row를 적재해야 흐른다.
- 파이프 스모크 테스트: `ddd_event`에 row 하나 직접 INSERT 후 위 토픽을 소비해 본다.

## 이슈보드

기획·이슈·도메인·와이어프레임은 issue-board(MCP)로 관리한다. 자세한 연동 규칙은 `CLAUDE.md` 참고.
