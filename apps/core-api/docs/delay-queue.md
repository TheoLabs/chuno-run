# Delay Queue 설계 노트 (임시 · draft)

> 작성: 2026-07-16 · 상태: **논의 정리(코드 미적용)** · 목적: BullMQ 지연 큐 파이프라인 설계 검토
>
> 이 문서의 코드는 **설계 스케치**다. 아직 레포에 적용되지 않았다. 실제 착수 전 검토용.

---

## 1. 목표

도메인 이벤트를 계기로 **일정 시간 뒤에** 어떤 로직을 실행하는 지연 큐 파이프라인.

대표 유스케이스: **방이 생성되면, 경주 시작 10분 전에 방 상태를 `ready`(모집 마감)로 전이**(참가자 2명 미만이면 `cancelled`). → 이슈 `[Room] 자동 모집 마감 · 취소`.

## 2. 파이프라인

```
방 생성 유스케이스        Room 저장(recruiting) + outbox(ddd_event) 이벤트 기록  ← 한 트랜잭션
                          이벤트 데이터: { roomId, closeAtMs = startOn - 10분 }
   │ Debezium CDC → Kafka(ddd_events 토픽)
   ▼
Kafka consumer(Dispatcher) delay = closeAtMs - now, jobId=`room-close:${roomId}` 로 queue.add
   │ BullMQ delayed set (delay 만료까지 대기)
   ▼
@Processor Worker          RoomLifecycleService.closeRecruitment(roomId) 호출만
   │
   ▼
closeRecruitment 유스케이스 방 reload → recruiting이면: 참가자>=2 ? ready : cancelled
```

**핵심: 도메인/애플리케이션 서비스는 큐를 전혀 모른다.** 두 개의 인프라 어댑터(등록 Dispatcher, 실행 Worker)가 도메인을 감싼다.

## 3. DDD 레이어링 원칙

| 레이어 | 책임 | 큐(BullMQ) 지식 |
| --- | --- | --- |
| 도메인 / 애플리케이션 | 유스케이스 실행, outbox에 이벤트 기록(`publishEvent`). "언제/무엇을"은 도메인 규칙(`scheduledAt`/`closeAtMs`) | ❌ 없음 |
| 인프라: **Dispatcher** | Kafka에서 이벤트 받아 `queue.add`(delay 계산, jobId) | ✅ 여기서만 |
| 인프라: **Worker(@Processor)** | 지연 만료 시 발화 → 유스케이스 호출만(얇은 어댑터) | ✅ (실행 트리거) |
| 애플리케이션 유스케이스 | 실제 비즈니스 로직 | ❌ 없음(테스트 가능) |

> "핸들러에서 큐 등록"이 문제가 아니라 **어느 레이어가 등록하느냐**가 문제다. 전용 인프라 Dispatcher가 하면 OK, 도메인/애플리케이션 서비스가 직접 하면 결합.

## 4. 왜 Kafka + CDC(아웃박스)인가 — 미학이 아니라 **정합성**

방 생성 유스케이스에서 BullMQ에 **직접** `queue.add` 하면 **dual-write 문제**:

- 방은 커밋됐는데 enqueue 실패 → **모집 마감 타이머가 영영 안 걸림**(recruiting에서 안 넘어감)
- enqueue는 됐는데 트랜잭션 롤백 → **유령 job**

트랜잭셔널 아웃박스(방 + 이벤트를 한 트랜잭션에 기록, CDC가 나중에 확실히 전달)가 이걸 해결한다. → 서비스가 큐를 안 만지는 건 "미학"이 아니라 **타이머를 잃지 않기 위한 정합성 장치**.

> 반대로 타이머를 가끔 잃어도 되는(중요도 낮은) 작업이면 CDC까지 안 가고 **커밋 후 훅(after-commit)에서 enqueue**가 훨씬 가볍다. 방 마감은 비즈니스 규칙이라 아웃박스가 맞다.

---

## 5. 구체 예제 코드 (방 모집 마감)

### 5.1 도메인 이벤트
```ts
// modules/room/domain/events/room-created.event.ts
import { DddEvent } from '@libs/ddd';

/** 방 생성됨. 아웃박스 적재 → CDC → Kafka(ddd_events). eventType = 'RoomCreated'. */
export class RoomCreated extends DddEvent {
  roomId: number;
  /** 모집 마감(시작 10분 전) 예정 시각 epoch ms — 컨슈머가 delay 계산에 사용. */
  closeAtMs: number;

  constructor(args: { roomId: number; closeAtMs: number }) {
    super();
    this.roomId = args.roomId;
    this.closeAtMs = args.closeAtMs;
  }
}
```

### 5.2 도메인(Room) 추가분 — "언제/무엇을"은 도메인 규칙
```ts
// modules/room/domain/room.entity.ts (추가분)
static readonly RECRUITMENT_CLOSE_LEAD_MINUTES = 10;
static readonly MIN_PARTICIPANTS = 2;

static create(args: Ctor) {
  Room.validGoalConditionRange(args);
  // ... 기존 capacity / startOn 검증 ...
  const room = new Room(args);
  room.join(args.hostUserId);

  // 모집 마감 예약을 "이벤트"로 선언만 한다. BullMQ 등록은 인프라가.
  room.publishEvent(
    new RoomCreated({
      roomId: room.id,                       // NOTE: id는 save 시 확정 — 아웃박스는 INSERT 이후 직렬화
      closeAtMs: room.recruitmentCloseAtMs(),
    })
  );
  return room;
}

/** 시작 10분 전 = 모집 마감 시각(epoch ms). "언제"는 도메인 규칙. */
recruitmentCloseAtMs(): number {
  return new Date(this.startOn).getTime() - Room.RECRUITMENT_CLOSE_LEAD_MINUTES * 60_000;
}

/** 모집 마감 — 워커 발화 시 호출. 현재 상태 재확인 후 방어적 전이(멱등). */
closeRecruitment() {
  if (this.status !== RoomStatus.RECRUITING) return;      // 이미 취소/변경됨 → no-op
  this.status =
    this.participants.length >= Room.MIN_PARTICIPANTS ? RoomStatus.READY : RoomStatus.CANCELLED;
}
```

### 5.3 큐 상수
```ts
// databases/bullmq/queues.ts
export const QUEUE = { ROOM_LIFECYCLE: 'room-lifecycle' } as const;
export const ROOM_JOB = { CLOSE_RECRUITMENT: 'close-recruitment' } as const;
```

### 5.4 BullMQ 워커 (@Processor, 인프라) — 로직은 유스케이스에 위임만
```ts
// modules/room/infrastructure/room-lifecycle.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QUEUE, ROOM_JOB } from '@databases/bullmq/queues';
import { RoomLifecycleService } from '../applications/room-lifecycle.service';

@Processor(QUEUE.ROOM_LIFECYCLE)
export class RoomLifecycleProcessor extends WorkerHost {
  constructor(private readonly roomLifecycleService: RoomLifecycleService) {
    super();
  }

  async process(job: Job<{ roomId: number }>) {
    if (job.name === ROOM_JOB.CLOSE_RECRUITMENT) {
      await this.roomLifecycleService.closeRecruitment(job.data.roomId);
    }
  }
}
```

### 5.5 애플리케이션 유스케이스 — 실제 비즈니스 로직(BullMQ 모름)
```ts
// modules/room/applications/room-lifecycle.service.ts
import { Injectable } from '@nestjs/common';
import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { RoomRepository } from '../infrastructure/room.repository';

@Injectable()
export class RoomLifecycleService extends DddService {
  constructor(private readonly roomRepository: RoomRepository) {
    super();
  }

  /** 모집 마감: 최신 상태 reload 후 도메인 규칙으로 전이. recruiting 아니면 no-op. */
  @Transactional()
  async closeRecruitment(roomId: number) {
    const [room] = await this.roomRepository.find({ id: roomId }, { relations: { participants: true } });
    if (!room) return;                 // 이미 삭제됨 → 조용히 종료

    room.closeRecruitment();           // recruiting → (참가자>=2 ? ready : cancelled)
    await this.roomRepository.save([room]);
  }
}
```

---

## 6. 공통 스케줄러 — Dispatcher를 도메인 무관하게 (어디서든 재사용)

"이벤트 → 큐/delay/jobId 매핑"만 **데이터(ScheduleSpec)**로 빼면 dispatcher는 공통화된다. 기존 `EventStoreRegistry`(정적 전역 레지스트리) 패턴과 동일하게.

### 6.1 스펙 + 레지스트리
```ts
// libs/scheduler/schedule.registry.ts
import { DddEvent } from '@libs/ddd';
import { JobsOptions } from 'bullmq';

/** "이 이벤트가 오면 → 이 큐/잡에 이 delay/jobId로 넣어라"는 순수 데이터. */
export interface ScheduleSpec<E extends DddEvent = any> {
  event: new (...a: any[]) => E;        // 도메인 이벤트 클래스 (eventType 매칭)
  queue: string;
  job: string;
  delayMs: (payload: E) => number;       // payload 기반 지연(ms)
  jobId: (payload: E) => string;         // 멱등 키
  jobOptions?: Omit<JobsOptions, 'delay' | 'jobId'>;
  group?: string;                        // Kafka consumer 그룹 (기본 'scheduler')
}

export class ScheduleRegistry {
  private static readonly specs = new Map<string, ScheduleSpec>();
  static register(spec: ScheduleSpec) { this.specs.set(spec.event.name, spec); }
  static all(): ScheduleSpec[] { return [...this.specs.values()]; }
  static get(eventName: string) { return this.specs.get(eventName); }
}
```

### 6.2 공통 디스패처 (큐를 이름으로 동적 resolve)
```ts
// libs/scheduler/scheduled-event.dispatcher.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventStoreRegistry } from '@libs/event-store';
import { ScheduleRegistry } from './schedule.registry';

/** 등록된 모든 ScheduleSpec을 EventStore 핸들러로 붙이고, 도메인 이벤트를 지연 큐로 흘려보낸다. */
@Injectable()
export class ScheduledEventDispatcher implements OnModuleInit {
  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit() {
    // 스펙마다 (이벤트 → 이 디스패처.dispatch)를 EventStore 라우팅에 등록.
    // onModuleInit은 EventStore.onApplicationBootstrap보다 먼저라 컨슈머 기동 전에 준비됨.
    for (const spec of ScheduleRegistry.all()) {
      EventStoreRegistry.register({
        eventName: spec.event.name,
        target: ScheduledEventDispatcher,
        methodKey: 'dispatch',
        group: spec.group ?? 'scheduler',
      });
    }
  }

  /** EventStore가 (payload, record)로 호출. eventType으로 스펙 찾아 enqueue만. */
  async dispatch(payload: any, record: { eventType: string }) {
    const spec = ScheduleRegistry.get(record.eventType);
    if (!spec) return;
    const queue = this.moduleRef.get<Queue>(getQueueToken(spec.queue), { strict: false });
    await queue.add(spec.job, payload, {
      ...spec.jobOptions,
      delay: Math.max(spec.delayMs(payload), 0),
      jobId: spec.jobId(payload),
    });
  }
}
```

### 6.3 모듈 (전역 1개)
```ts
// libs/scheduler/scheduler.module.ts
import { Global, Module } from '@nestjs/common';
import { ScheduledEventDispatcher } from './scheduled-event.dispatcher';

@Global()
@Module({ providers: [ScheduledEventDispatcher], exports: [ScheduledEventDispatcher] })
export class SchedulerModule {}
```

### 6.4 각 feature는 "스펙 한 줄"만 (dispatcher 클래스 안 만듦)
```ts
// modules/room/infrastructure/room.schedules.ts   (RoomModule에서 import → 등록 side-effect)
import { ScheduleRegistry } from '@libs/scheduler';
import { RoomCreated } from '../domain/events/room-created.event';
import { QUEUE, ROOM_JOB } from '@databases/bullmq/queues';

ScheduleRegistry.register({
  event: RoomCreated,
  queue: QUEUE.ROOM_LIFECYCLE,
  job: ROOM_JOB.CLOSE_RECRUITMENT,
  delayMs: (e) => e.closeAtMs - Date.now(),
  jobId: (e) => `room-close:${e.roomId}`,
});
```

→ 위 5.x의 `RoomSchedulingDispatcher`(feature 전용 dispatcher)는 **삭제**된다. 새 스케줄 이벤트는 어느 모듈이든 `ScheduleRegistry.register({...})` 한 줄. Worker(@Processor)와 use-case는 그대로.

---

## 7. 설계 결정 / 주의점

- **도메인 순수성** — 스펙(큐/delay)은 **인프라**(`room.schedules.ts`)에 둔다. 도메인 이벤트 클래스엔 큐 지식 X. (더 간결한 `@ScheduleTo(...)` 데코레이터를 이벤트에 다는 변형은 도메인→인프라 결합이라 비추.)
- **멱등(idempotency)** — Kafka는 at-least-once. `jobId = room-close:${roomId}` 결정적 키로 재소비돼도 중복 예약 안 됨.
- **워커는 상태 재확인** — job payload엔 **식별자만**(`roomId`). `closeRecruitment()`가 reload 후 `recruiting`일 때만 전이 → 그 사이 취소/시간변경돼도 안전.
- **payload는 plain object** — `dispatch`가 받는 건 `record.payload`(JSON 파싱된 순수 데이터)라 이벤트 클래스 인스턴스가 아님. 스펙은 **필드만** 참조(`e.closeAtMs`), 메서드 호출 금지.
- **큐 동적 resolve** — `getQueueToken(spec.queue)` + `moduleRef`로 이름으로 꺼냄. 단 그 큐는 `BullModule.registerQueue`에 등록돼 있어야 함.
- **그룹 격리** — 스케줄 이벤트는 기본 `group:'scheduler'` → `core-api.scheduler` 컨슈머 하나가 전부 처리(다른 도메인 컨슈머와 offset·장애 격리).
- **enqueue만 공통화, 실행은 per-도메인** — Worker는 도메인 로직이라 모듈별. (원하면 job→handler도 `JobRegistry`로 일반화 가능하나 핸들러가 다 달라 이득 적음.)
- **PROCESSED 이중 마커 주의** — CDC로 가면 진행 마커는 **Kafka offset**. 소비자에서 `ddd_event`를 또 PROCESSED로 쓰면 불필요한 write + offset commit과 레이스. (기존 `DddEventStatus`는 in-process용이라 이미 주석 처리됨 — 유지.)

## 8. 아직 안 한 것 / TODO (내일 검토)

- [ ] **BullMQ 인프라 배선** — `databases/bullmq/bullmq.module.ts`(`BullModule.forRootAsync` connection=`configsService.redis`) + `registerQueue(QUEUE.ROOM_LIFECYCLE)` + `databases.module.ts`에 추가. (별도 sketch 있음)
- [ ] **Redis 기동** — 현재 도커에 redis 컨테이너 **미기동**(mysql·kafka·debezium·localstack만). BullMQ 필수. 인프라 확인.
- [ ] **startOn 변경 시 재예약** — 방장이 시작시간 수정 시 `RoomStartTimeChanged` 이벤트 → dispatcher가 **같은 jobId로 remove→re-add**(또는 `job.changeDelay`).
- [ ] **방 취소/삭제 시 job 정리** — T 이전 취소면 대기 job 제거(또는 워커 no-op으로 방어됨).
- [ ] **durability sweeper** — `closeAt` 지났는데 아직 recruiting인 방 주기 스캔·보정(Redis 유실 대비 belt-and-suspenders). 긴 delay(며칠) + Redis 지속성 리스크.
- [ ] **id 확정 타이밍** — `RoomCreated`의 `roomId`는 save 시 확정. 아웃박스 flush가 INSERT 이후 직렬화되는지 확인(현재 `DddEvent.fromEvent`는 payload만 세팅).
- [ ] (선택) `@ScheduleTo` 데코레이터 변형 / worker의 `JobRegistry` 일반화.

## 9. 참고 — 기존 인프라 (이미 있음)

| 파일 | 역할 |
| --- | --- |
| `libs/event-store/event-store.service.ts` | Debezium→Kafka 구독, `@EventHandler` 라우팅, 재시도/DLQ, ALS txId. 그룹당 컨슈머 |
| `libs/event-store/event-store.registry.ts` | `EventStoreRegistry` 정적 레지스트리 (`register`/`getGroups`/`getHandlers`) |
| `libs/decorators/event-handler.decorator.ts` | `@EventHandler(EventClass, { group })` |
| `libs/ddd/ddd-event.ts` | `DddEvent`(outbox) — `eventType`, `payload`, `scheduledAt?`, `fromEvent` |
| `libs/ddd/ddd-aggregate.ts` | `DddAggregate.publishEvent()` / `getPublishedEvents()` |
| `libs/decorators/transactional.decorator.ts` | `@Transactional` — 트랜잭션 + 아웃박스(in-process emit은 주석 처리됨) |
| `configs/configuration.ts`, `configs.service.ts`, `.env.local` | `redis: RedisOptions`(host/port), `ConfigsService.get redis()` — **준비됨** |
| `README.md` (이벤트 파이프라인 섹션) | Debezium 커넥터 등록 curl, 토픽 `chuno.chuno_run.ddd_event` |
