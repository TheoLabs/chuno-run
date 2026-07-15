import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Consumer, EachMessagePayload, Kafka, Producer } from 'kafkajs';
import { ConfigsService } from '@configs';
import { asyncLocalStorage, ContextKey } from '@libs/context';
import { EventStoreRegistry, type EventHandlerRegistration } from './event-store.registry';

interface DddEventRecord {
  id: string;
  txId: string;
  eventType: string;
  payload: unknown;
  [key: string]: unknown;
}

type Handler = Record<string | symbol, (...args: any[]) => unknown>;

/**
 * Debezium CDC 가 ddd_events 테이블 변경을 Kafka 단일 토픽으로 흘려보내면,
 * 이 서비스가 토픽을 구독해 메시지를 파싱하고 @EventHandler 로 등록된 핸들러로 라우팅한다.
 *
 * 흐름: ddd_events(outbox) → Debezium → Kafka(ddd_events 토픽) → EventStore → @EventHandler 메서드
 */
@Injectable()
export class EventStore implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(EventStore.name);
  private consumers: Consumer[] = [];
  private producer?: Producer;
  private dlqTopic = '';

  /** 핸들러 재시도 간 대기(ms). 길이 = 추가 재시도 횟수. (총 시도 = 1 + 길이) */
  private static readonly RETRY_DELAYS_MS = [500, 2000];

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly configsService: ConfigsService
  ) {}

  async onApplicationBootstrap() {
    const groups = EventStoreRegistry.getGroups();
    if (groups.length === 0) {
      this.logger.log('등록된 @EventHandler 가 없어 Kafka consumer 를 시작하지 않습니다.');
      return;
    }

    const { clientId, brokers, groupId, topic } = this.configsService.kafka;
    this.dlqTopic = `${topic}.dlq`;
    const kafka = new Kafka({ clientId, brokers });

    this.producer = kafka.producer();
    await this.producer.connect();

    // ★ 그룹마다 독립 컨슈머 → 독립 offset / 리플레이 / 장애격리
    for (const group of groups) {
      const consumer = kafka.consumer({
        groupId: `${groupId}.${group}`, // 예: core-api.email, core-api.room
        sessionTimeout: 6000,
        heartbeatInterval: 2000,
        rebalanceTimeout: 10000,
        maxWaitTimeInMs: 1000,
      });
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false }); // ← 토픽은 여전히 하나
      await consumer.run({ eachMessage: (payload) => this.handleMessage(group, payload) });
      this.consumers.push(consumer);
      this.logger.log(`consumer 기동 (groupId=${groupId}.${group})`);
    }
  }

  private async handleMessage(group: string, { message }: EachMessagePayload) {
    const raw = message.value?.toString();
    if (!raw) return;
    const record = this.parseRecord(raw);
    if (!record) return;

    const handlers = EventStoreRegistry.getHandlers(group, record.eventType);
    for (const registration of handlers) {
      await this.processHandler(registration, record, raw);
    }
  }

  /**
   * 단일 핸들러를 바운디드 재시도로 실행하고, 모두 실패하면 DLQ 로 보낸 뒤 진행한다.
   * (무한 재시도로 파티션이 막히지 않게 한다. 멱등성은 핸들러 책임 — at-least-once)
   */
  private async processHandler(registration: EventHandlerRegistration, record: DddEventRecord, raw: string) {
    const maxAttempts = EventStore.RETRY_DELAYS_MS.length + 1;
    const label = `${record.eventType}#${String(registration.methodKey)}`;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.runHandler(registration, record);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`EventHandler 실패(시도 ${attempt}/${maxAttempts}) [${label}] - ${record.id}: ${message}`);

        if (attempt === maxAttempts) {
          await this.sendToDlq(registration, record, raw, error, attempt);
          return;
        }
        await this.sleep(EventStore.RETRY_DELAYS_MS[attempt - 1]);
      }
    }
  }

  /** @Transactional 등이 의존하는 ALS 컨텍스트 스토어를 매 시도마다 새로 열어 핸들러를 실행한다. */
  private async runHandler(registration: EventHandlerRegistration, record: DddEventRecord) {
    await asyncLocalStorage.run(new Map<string, unknown>(), async () => {
      asyncLocalStorage.getStore()?.set(ContextKey.TXID, record.txId);
      const instance = this.moduleRef.get<Handler>(registration.target as never, { strict: false });
      await instance[registration.methodKey](record.payload, record);
    });
  }

  /** 재시도 소진된 메시지를 DLQ 토픽으로 보낸다(에러 메타 포함). 원본은 그대로 첨부. */
  private async sendToDlq(
    registration: EventHandlerRegistration,
    record: DddEventRecord,
    raw: string,
    error: unknown,
    attempts: number
  ) {
    const stack = error instanceof Error ? (error.stack ?? error.message) : String(error);
    const handlerName = `${(registration.target as { name?: string }).name ?? 'Unknown'}#${String(registration.methodKey)}`;
    this.logger.error(
      `EventHandler 최종 실패 → DLQ [${record.eventType}#${String(registration.methodKey)}] - ${record.id}\n${stack}`
    );

    if (!this.producer) return;
    try {
      await this.producer.send({
        topic: this.dlqTopic,
        messages: [
          {
            key: record.id,
            value: JSON.stringify({
              eventId: record.id,
              eventType: record.eventType,
              handler: handlerName,
              attempts,
              error: error instanceof Error ? error.message : String(error),
              failedAt: new Date().toISOString(),
              original: raw,
            }),
          },
        ],
      });
    } catch (dlqError) {
      this.logger.error(
        `DLQ 전송 실패 - ${record.id}: ${dlqError instanceof Error ? dlqError.message : String(dlqError)}`
      );
    }
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Debezium 메시지(value)를 파싱해 ddd_events 행(after-image)과 payload 를 복원한다.
   * schemas.enable=true 면 { schema, payload } 래퍼가, false 면 envelope 자체가 들어온다.
   * 삭제(op='d')는 after 가 없어 스킵한다.
   */
  private parseRecord(raw: string): DddEventRecord | null {
    let envelope: any;
    try {
      envelope = JSON.parse(raw);
    } catch {
      this.logger.warn('Kafka 메시지 JSON 파싱 실패 — 스킵');
      return null;
    }

    const change = envelope?.payload ?? envelope;
    const after = change?.after;
    if (!after || !after.eventType) return null;

    return { ...after, payload: this.parsePayload(after.payload) };
  }

  private parsePayload(payload: unknown): unknown {
    if (typeof payload !== 'string') return payload;
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }

  async onModuleDestroy() {
    await Promise.all(this.consumers.map((c) => c.disconnect()));
    await this.producer?.disconnect();
  }
}
