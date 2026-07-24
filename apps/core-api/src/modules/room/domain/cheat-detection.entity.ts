import { today } from '@libs/date';
import { DddAggregate } from '@libs/ddd';
import { CalendarDate } from '@types';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Participant } from './participant.entity';

export enum CheatType {
  /** 사람 속도 범위 초과. */
  ABNORMAL_SPEED = 'abnormalSpeed',
  /** 위치 조작 의심 패턴. */
  SPOOF_SUSPECTED = 'spoofSuspected',
  /** 서버·클라 경과 시간 괴리. */
  TIMESTAMP_MISMATCH = 'timestampMismatch',
  /** 도달 시간이 물리적으로 불가능. */
  IMPOSSIBLE_FINISH = 'impossibleFinish',
}

export enum CheatAction {
  /** 해당 보고만 반려(경주는 계속). */
  REJECTED = 'rejected',
  /** 이 경주 기록 무효(dnf) 처리. */
  VOIDED = 'voided',
}

type Ctor = {
  participantId: number;
  type: CheatType;
  action: CheatAction;
  reportedDistanceMeter: number;
  acceptedDistanceMeter: number;
  observedSpeedMps?: number | null;
  thresholdSpeedMps?: number | null;
  intervalSeconds?: number | null;
  detail?: string | null;
};

/**
 * 서버 정합성 검사에 걸린 진행 보고 한 건의 탐지 이력.
 *
 * 원시 GPS 좌표를 보존하지 않으므로 판단 근거는 거리 증분·페이스·타임스탬프 관측값이다.
 * 경미한 이상치는 해당 보고만 반려(rejected)하고, 러닝으로 보기 어려운 패턴은 그 경주 기록을
 * 무효(voided) 처리한다. 계정 제재는 자동화하지 않고 운영자가 백오피스에서 이 이력을 보고 판단한다.
 */
@Entity()
@Index('idx_cheat_detection_participant_id', ['participantId'])
export class CheatDetection extends DddAggregate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '탐지된 참가 기록' })
  participantId: number;

  @Column({ type: 'enum', enum: CheatType, comment: '탐지 유형' })
  type: CheatType;

  @Column({ type: 'enum', enum: CheatAction, comment: '자동 조치(반려/무효)' })
  action: CheatAction;

  @Column({ comment: '클라이언트가 보고한 누적 거리(m)' })
  reportedDistanceMeter: number;

  @Column({ comment: '서버가 유지한 누적 거리(m)' })
  acceptedDistanceMeter: number;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true, comment: '관측된 구간 속도(m/s)' })
  observedSpeedMps: number | null;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true, comment: '판정에 쓴 임계 속도(m/s)' })
  thresholdSpeedMps: number | null;

  @Column({ type: 'int', nullable: true, comment: '직전 보고 이후 경과 시간(초)' })
  intervalSeconds: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '사람이 읽을 판정 설명' })
  detail: string | null;

  @Column({ comment: '탐지 시각' })
  detectedOn: CalendarDate;

  @ManyToOne(() => Participant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participantId' })
  participant: Participant;

  private constructor(args: Ctor) {
    super();

    if (args) {
      this.participantId = args.participantId;
      this.type = args.type;
      this.action = args.action;
      this.reportedDistanceMeter = args.reportedDistanceMeter;
      this.acceptedDistanceMeter = args.acceptedDistanceMeter;
      this.observedSpeedMps = args.observedSpeedMps ?? null;
      this.thresholdSpeedMps = args.thresholdSpeedMps ?? null;
      this.intervalSeconds = args.intervalSeconds ?? null;
      this.detail = args.detail ?? null;
      this.detectedOn = today('YYYY-MM-DD HH:mm:ss');
    }
  }

  static create(args: Ctor) {
    return new CheatDetection(args);
  }
}
