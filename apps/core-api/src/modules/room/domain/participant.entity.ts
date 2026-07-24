import { DddBaseAggregate } from '@libs/ddd';
import { CalendarDate } from '@types';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Room } from './room.entity';
import { today } from '@libs/date';

export enum ParticipantStatus {
  JOINED = 'joined',
  RUNNING = 'running',
  FINISHED = 'finished',
  DNF = 'dnf', // NOTE: 중도 이탈
}

type Ctor = {
  userId: number;
};

@Entity()
@Unique('unique_room_id_user_id', ['roomId', 'userId'])
@Index('idx_participant_user_id', ['userId'])
export class Participant extends DddBaseAggregate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomId: number;

  @Column({ comment: '참가 user id' })
  userId: number;

  @Column({ type: 'enum', enum: ParticipantStatus })
  status: ParticipantStatus;

  @Column({ comment: '현재까지 달린 거리(m)' })
  currentDistanceMeter: number;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '목표 도달 또는 종료 시각' })
  finishedOn: CalendarDate | null;

  @Column({ type: 'int', nullable: true, comment: '최종 등수' })
  finalRank: number | null;

  @Column({ comment: '방 참가 시각' })
  joinOn: CalendarDate;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '[2차] 마지막으로 인정된 진행 보고 시각 — 정합성 검사·복귀 재동기화 기준점',
  })
  lastProgressOn: CalendarDate | null;

  @Column({ default: false, comment: '[2차] 부정행위 탐지로 기록이 무효 처리됐는지' })
  voided: boolean;

  @ManyToOne(() => Room, (room) => room.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  private constructor(args: Ctor) {
    super();

    if (args) {
      this.userId = args.userId;
      this.status = ParticipantStatus.JOINED;
      this.currentDistanceMeter = 0;
      this.joinOn = today('YYYY-MM-DD HH:mm:ss');
      this.lastProgressOn = null;
      this.voided = false;
    }
  }

  static create(args: Ctor) {
    return new Participant(args);
  }

  /** 경주 시작 — joined → running. 이미 running이면 멱등하게 무시한다. */
  start(startedOn?: CalendarDate) {
    if (this.status !== ParticipantStatus.JOINED) {
      return;
    }

    this.status = ParticipantStatus.RUNNING;
    // 첫 진행 보고의 구간(거리 증분·속도)을 출발 시각부터 재기 위한 기준점.
    this.lastProgressOn = startedOn ?? today('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * 진행값 갱신 — 클라이언트가 계산한 누적 거리를 반영한다(서버 재계산 없음, 릴레이 모델).
   * 재연결 후 재동기화·순서 뒤바뀐 패킷에 대비해 **뒤로 가지 않게** 최대값만 유지한다.
   */
  progress(distanceMeter: number, reportedOn?: CalendarDate) {
    if (this.status !== ParticipantStatus.RUNNING) {
      return;
    }

    this.currentDistanceMeter = Math.max(this.currentDistanceMeter, Math.trunc(distanceMeter));
    // [2차] 정합성 검사를 통과한 보고 시각을 기록해 다음 구간 검사의 기준점으로 삼는다.
    this.lastProgressOn = reportedOn ?? today('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * [2차] 부정행위 탐지로 이 경주 기록을 무효 처리한다 — voided=true, running/finished → dnf.
   * 최종 등수는 종료 시 finalize가 완주자 뒤 누적 거리순으로 매긴다.
   */
  voidRecord(voidedOn: CalendarDate) {
    this.voided = true;
    this.status = ParticipantStatus.DNF;
    this.finishedOn = this.finishedOn ?? voidedOn;
  }

  /** 목표 도달 — running → finished. 등수는 서버 도착 순서로 방(Room)이 정한다. */
  finish({ finalRank, finishedOn }: { finalRank: number; finishedOn: CalendarDate }) {
    this.status = ParticipantStatus.FINISHED;
    this.finalRank = finalRank;
    this.finishedOn = finishedOn;
  }

  /** 미완주 확정 — 제한 시간 만료·중도 이탈·앱 강제 종료. 완주자 뒤 누적 거리순 등수를 받는다. */
  markDnf({ finalRank, finishedOn }: { finalRank: number; finishedOn: CalendarDate }) {
    this.status = ParticipantStatus.DNF;
    this.finalRank = finalRank;
    this.finishedOn = finishedOn;
  }

  /**
   * 경주 포기 — running → dnf. 이 시점에는 등수를 매기지 않는다(아직 달리는 참가자가 있으므로).
   * 최종 등수는 경주 종료 시 `Room.finalize` 가 완주자 뒤 누적 거리순으로 확정한다.
   */
  quit(quitOn: CalendarDate) {
    if (this.status !== ParticipantStatus.RUNNING) {
      return;
    }

    this.status = ParticipantStatus.DNF;
    this.finishedOn = quitOn;
  }
}
