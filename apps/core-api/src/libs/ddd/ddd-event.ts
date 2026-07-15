import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

// export enum DddEventStatus {
//   PENDING = 'pending',
//   PROCESSED = 'processed',
//   FAILED = 'failed',
// }

@Entity()
@Index('idx_ddd_event_txId', ['txId'])
@Index('idx_ddd_event_created_at', ['createdAt'])
export class DddEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  txId: string;

  @Column({ comment: '이벤트의 타입' })
  eventType: string;

  @Column({ type: 'text' })
  payload: string;

  // NOTE: Kafka + CDC 를 사용하면서 인프로세스 방식은 필요가 없어짐.
  // @Column({ type: 'enum', enum: DddEventStatus, default: DddEventStatus.PENDING })
  // eventStatus: DddEventStatus;

  @Column({ comment: '실행 예정 시각', nullable: true })
  scheduledAt?: Date;

  @Column()
  private occurredAt: Date;

  @CreateDateColumn()
  private readonly createdAt: Date;

  @UpdateDateColumn()
  private readonly updatedAt: Date;

  constructor() {
    this.eventType = this.constructor.name;
    this.occurredAt = new Date();
  }

  static fromEvent(event: DddEvent) {
    const dddEvent = new DddEvent();
    const { occurredAt, eventType, ...payload } = event;
    dddEvent.eventType = event.constructor.name;
    dddEvent.payload = JSON.stringify(payload);
    return dddEvent;
  }

  setTxId(txId: string) {
    this.txId = txId;
  }
}
