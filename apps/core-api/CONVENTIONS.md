# core-api API 컨벤션

이 문서는 chuno-run `core-api`의 HTTP API 설계 규칙이다. 새 엔드포인트를 추가할 때 이 규칙을 따른다.

## 1. 원칙

- REST 리소스 지향. 응답은 항상 `{ data }` 봉투로 감싼다.
- JSON 필드는 **camelCase**, 날짜는 `YYYY-MM-DD HH:mm:ss` 문자열(`CalendarDate`).
- 요청 검증은 **DTO + class-validator**로 한다 (§7).

## 2. HTTP 메서드

| 메서드 | 용도 |
| --- | --- |
| `GET` | 조회 (부수효과 없음, 멱등) |
| `POST` | 생성, 그리고 생명주기 액션(§5) |
| `PUT` | 수정 — **모든 수정은 PUT** (PATCH 안 씀) |
| `DELETE` | 삭제 / 제거 |

- **PUT 의미**: 전체 교체가 아니라 **넘긴 필드만 수정**한다. 단, 같은 요청을 반복해도 결과가 같도록 **멱등**하게 구현한다.
- `PATCH`는 사용하지 않는다.

## 3. 엔드포인트 & 대상 구분

접두사로 대상 사용자를 나눈다.

| 접두사 | 대상 | 가드 |
| --- | --- | --- |
| `/*` | 일반 사용자 (앱) | `UserGuard` |
| `/admins/*` | 백오피스 (관리자 전용) | `AdminGuard` |

예: 일반 사용자 방 목록 `GET /rooms`, 관리자 방 목록 `GET /admins/rooms`.

- URI 버저닝(`/v1`)은 **하지 않는다**.

## 4. 리소스 네이밍

- **복수 명사 + kebab-case**: `/rooms`, `/user-consents`, `/admins/rooms`
- path param은 숫자 id, `ParseIntPipe`로 파싱: `GET /rooms/:id`
- 하위 리소스는 소속 경로로 표현: `/rooms/:id/participants`

## 5. 생명주기 액션 (상태 전이 / 이벤트)

CRUD가 아닌 도메인 액션은 **행위 서브경로 + 의미에 맞는 메서드**로 표현한다. (필드 수정은 §2의 `PUT`, 상태 전이는 액션 경로 — 하나의 `PUT`에 섞지 않는다.)

- **취소 / 제거류** → `DELETE /rooms/:id` 또는 `POST /rooms/:id/cancel`
  - 단순 삭제·제거는 `DELETE`.
  - 상태를 남기는 취소(예: `canceled`로 전이)거나 사유 등 부가 정보가 필요하면 `POST /:id/cancel`.
- **발생 / 실행류** → `POST /rooms/:id/start`, `POST /rooms/:id/participants/:pid/kick`

## 6. 요청 — 쿼리 파라미터

### 배열
콤마 구분으로 받는다.
```
GET /rooms?statuses=recruiting,ready
```

### 필터
- 필터 키는 필드명을 쓴다. 단일값은 단수(`?status=active`), 다중값은 복수(`?statuses=active,ready`).

### 페이지네이션
- offset 기반: `page`(1-base), `limit`.
```
GET /rooms?page=1&limit=20
```
- **`meta`(page/limit 등)는 응답에 넣지 않는다.** 총 개수는 리스트 응답의 `total`로만 전달한다(§8).

### 정렬
- **단일 정렬만** 지원한다. `sort`=정렬 필드, `order`=정렬 방향(`asc` | `desc`).
```
GET /rooms?sort=startOn&order=desc
```

## 7. 요청 — 바디 & 검증

- 엔드포인트마다 **DTO 클래스**를 만들고 **class-validator** 데코레이터로 검증한다.
- 전역 `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`를 적용한다.
- 콤마 배열 파라미터는 DTO에서 파싱한다:
  ```ts
  @IsOptional()
  @Transform(({ value }) => (value as string).split(','))
  @IsEnum(RoomStatus, { each: true })
  statuses?: RoomStatus[];
  ```
- DTO 위치: `presentation/dto/*.dto.ts`. 요청 DTO는 `Create*Request` / `Update*Request` / `List*Query`, 파라미터는 필드명 그대로.

> 현재 `class-validator`/`class-transformer`는 미도입 상태다. 도입 시 이 규칙을 적용한다.

## 8. 응답 포맷

- 성공 응답은 항상 `{ data }`로 감싼다. `DELETE`도 204 대신 `{ data }`로 통일한다.

### 단건
```json
{ "data": { "id": 1, "title": "아침 3km 대결", "status": "recruiting" } }
```

### 리스트
`data`는 `{ items, total }` 형태로 반환한다.
```json
{ "data": { "items": [ { "id": 1 }, { "id": 2 } ], "total": 42 } }
```

### 엔티티 → DTO 변환
- 컨트롤러는 **엔티티를 직접 반환하지 않는다.** `presentation/dto/*.response.ts`에 Response DTO를 만들고
  `DddBaseAggregate.toInstance(Dto)`(내부 `plainToInstance`)로 변환해 `{ data }`에 담는다.
  민감 필드 노출 방지 + 응답 형태 일관성.

## 9. 상태 코드 & 에러

- 성공: `POST`=201, 그 외(`GET`/`PUT`/`DELETE`)=200 (Nest 기본값 유지).
- 에러: `400`(검증) · `401`(인증) · `403`(권한) · `404`(없음) · `409`(유니크/상태 충돌).
- 에러 응답은 Nest 기본 형식(`{ statusCode, message, error }`)을 사용한다.

## 10. 인증 / 가드

- `/*` → `UserGuard`, `/admins/*` → `AdminGuard`. 컨트롤러 레벨 `@UseGuards`로 건다.
- 인증된 사용자/관리자는 `Context`의 `ContextKey.USER`로 주입해 사용한다.

## 11. 파일 · 클래스 네이밍

대상 접두사를 파일·클래스명에 반영한다. (모듈 구조는 `presentation`(컨트롤러) / `applications`(서비스) / `domain`(엔티티).)

| 대상 | 파일 | 클래스 |
| --- | --- | --- |
| 일반 사용자 | `general-<resource>.controller.ts` | `General<Resource>Controller` |
| 관리자 | `admin-<resource>.controller.ts` | `Admin<Resource>Controller` |

## 12. 예시 — Room

| 메서드 · 경로 | 설명 | 응답 |
| --- | --- | --- |
| `POST /rooms` | 방 생성 | `201 { data: room }` |
| `GET /rooms?page=1&limit=20&statuses=recruiting,ready&sort=startOn&order=asc` | 방 목록 | `200 { data: { items, total } }` |
| `GET /rooms/:id` | 방 단건 | `200 { data: room }` |
| `PUT /rooms/:id` | 방 조건 수정(목표거리/제한시간/정원 등) | `200 { data: room }` |
| `POST /rooms/:id/cancel` | 방 취소(→ canceled) | `200 { data: room }` |
| `POST /rooms/:id/start` | 경기 시작(→ live) | `200 { data: room }` |
| `POST /rooms/:id/participants` | 입장(참가자 생성) | `201 { data: participant }` |
| `DELETE /rooms/:id/participants/:pid` | 나가기 | `200 { data: { id } }` |
| `POST /rooms/:id/participants/:pid/kick` | 강퇴(방장) | `200 { data: participant }` |
| `GET /admins/rooms?...` | (관리자) 방 목록 | `200 { data: { items, total } }` |

## 13. 모듈 아키텍처 & 폴더 구조

`src/modules/<domain>/`(예: `user`, `room`, `agreement`)마다 DDD 4계층으로 나눈다.

```
modules/<domain>/
  presentation/     # 컨트롤러 (general-*/admin-*.controller.ts)
  applications/     # 유스케이스 서비스 — DddService 상속
  domain/           # 엔티티(*.entity.ts) + 복잡한 도메인 로직
  infrastructure/   # <domain>.repository.ts (딱 하나) — DddRepository<T> 상속
```

### presentation (컨트롤러)
- 각 핸들러는 **항상 아래 4단계 골격**을 따른다:
  ```ts
  // 1. Destructure body, params, query
  // 2. Get context
  // 3. Get result
  // 4. Send response
  ```
- 응답은 §8 봉투(엔티티 직접 반환 금지, Response DTO로 변환). 요청 검증 DTO는 `presentation/dto/`.
- **대상별 요청 DTO를 분리**한다. 민감 필터(예: `statuses`/`types`)는 **관리자 DTO에만** 노출하고
  일반 DTO에는 두지 않는다(ValidationPipe `forbidNonWhitelisted`가 걸러줌).

### applications (서비스)
- **`DddService`를 상속**한다. 유스케이스 오케스트레이션(리포지토리 호출, 트랜잭션 경계)을 담당한다.
- 도메인 규칙 자체는 여기 두지 않는다(→ domain).
- **대상별 가시성은 서비스에서 서버가 고정한다.** 하나의 도메인 서비스에 대상별 메서드를 둔다
  (예: `listForUser` / `listForAdmin`). 일반 사용자용 메서드는 제약을 하드코딩한다
  (예: Agreement는 일반 사용자에게 `statuses: [active]`만 조회). **클라이언트가 준 민감 필터를
  그대로 신뢰해 레포지토리에 흘려보내지 않는다.** 레포지토리는 도메인 단위로 공유하며 모든 필터를 허용(내부용).

### domain
- 엔티티(`*.entity.ts`): **private 생성자 + `static create()` 팩토리**, 컬럼 `comment`, enum 동일 파일.
  애그리게이트 루트는 `DddAggregate`, owned child는 `DddBaseAggregate` 상속.
- **복잡한 비즈니스 로직·추상화는 domain에 둔다**: 도메인 이벤트(`DddEvent`), 도메인 서비스,
  스펙(Specification)·밸리데이터 등.
- 도메인 규칙 위반은 도메인에서 Nest 예외를 throw (예: `Agreement.create`의 시행일 검증).

### infrastructure
- **`<domain>.repository.ts` 파일만** 둔다. `DddRepository<T>` 상속, `entityClass` 지정.
- 조회는 `find(conditions, options?)` / `count(conditions)`처럼 **conditions 객체**를 받고,
  배열 필터는 복수형 + `checkInValue`(In) + `stripUndefined`로 조립한다. 관계는 `convertOptions(options)`.
- `save()`/`remove()`/`softRemove()`는 애그리게이트가 `publishEvent()`로 발행한 도메인 이벤트를
  **같은 트랜잭션으로 아웃박스(`ddd_events`)에 적재**한다 (→ Debezium CDC → Kafka).

### 새 도메인 추가 체크리스트
1. `domain/*.entity.ts` → `src/databases/typeorm/entities.ts` 배열에 등록
2. `infrastructure/<domain>.repository.ts` (`DddRepository` 상속)
3. `applications/*.service.ts` (`DddService` 상속)
4. `presentation/*.controller.ts` (4단계 골격)
5. `<domain>.module.ts`에 controller·service·repository 등록 → `domain.module.ts` imports/exports에 추가

## 14. 트랜잭션

- **CUD(Create·Update·Delete)는 트랜잭션 필수.** applications의 **`DddService` 메서드**에
  **`@Transactional()`**(`src/libs/decorators/transactional.decorator.ts`)를 붙인다. 조회(GET)는 불필요.
- 동작: 메서드를 `entityManager.transaction()`으로 감싸고, 트랜잭션 EntityManager를
  `Context(ContextKey.ENTITY_MANAGER)`에 실어 `DddRepository`가 같은 트랜잭션으로 동작하게 한다.
  커밋 후 쌓인 도메인 이벤트를 `EventEmitter`(`ddd-event.created`)로 Redis 큐에 발행한다.
- 반드시 **`DddService` 상속 클래스의 메서드**에만 붙인다(내부에서 context·entityManager·eventEmitter를 참조).
