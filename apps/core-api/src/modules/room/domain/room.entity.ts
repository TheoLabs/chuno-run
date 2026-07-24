import { DddAggregate } from '@libs/ddd';
import { CalendarDate } from '@types';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Participant, ParticipantStatus } from './participant.entity';
import { BadRequestException } from '@nestjs/common';
import { addMinutes, today } from '@libs/date';

export enum RoomStatus {
  RECRUITING = 'recruiting',
  READY = 'ready',
  LIVE = 'live',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

type Ctor = {
  hostUserId: number;
  title: string;
  goalDistanceMeter: number;
  goalLimitMinutes: number;
  startOn: CalendarDate;
  capacity: number;
};

@Entity()
export class Room extends DddAggregate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '방장' })
  hostUserId: number;

  @Column({ comment: '방 제목' })
  title: string;

  @Column({ comment: '목표 거리 (m)' })
  goalDistanceMeter: number;

  @Column({ comment: '제한 시간 (분)' })
  goalLimitMinutes: number;

  @Column({ comment: '게임 시작 시간' })
  startOn: CalendarDate;

  @Column({ comment: '최대 수용 인원' })
  capacity: number;

  @Column({ type: 'enum', enum: RoomStatus, comment: '방 상태' })
  status: RoomStatus;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '게임 종료 시간 (YYYY-MM-DD HH:mm:ss)' })
  finishedOn: CalendarDate | null;

  @OneToMany(() => Participant, (participant) => participant.room, { cascade: true, orphanedRowAction: 'delete' })
  participants: Participant[];

  static readonly GOAL_DISTANCE_METER_MIN = 100;
  static readonly GOAL_DISTANCE_METER_MAX = 100_000;
  static readonly GOAL_LIMIT_MINUTES_MIN = 5;
  static readonly GOAL_LIMIT_MINUTES_MAX = 1440;

  /** 시작 몇 분 전에 모집을 마감하는가 (기획: 시작 10분 전). */
  static readonly RECRUIT_CLOSE_BEFORE_MINUTES = 10;

  /** 경주가 성립하는 최소 인원. 모집 마감 시점에 이 인원 미만이면 자동 취소된다. */
  static readonly MIN_PARTICIPANT_COUNT = 2;

  private constructor(args: Ctor) {
    super();

    if (args) {
      this.hostUserId = args.hostUserId;
      this.title = args.title;
      this.goalDistanceMeter = args.goalDistanceMeter;
      this.goalLimitMinutes = args.goalLimitMinutes;
      this.startOn = args.startOn;
      this.capacity = args.capacity;
      this.status = RoomStatus.RECRUITING;
      this.participants = [];
    }
  }

  private static validGoalConditionRange(args: { goalDistanceMeter?: number; goalLimitMinutes?: number }) {
    const { goalDistanceMeter, goalLimitMinutes } = args;

    if (
      goalDistanceMeter !== undefined &&
      (goalDistanceMeter < Room.GOAL_DISTANCE_METER_MIN || goalDistanceMeter > Room.GOAL_DISTANCE_METER_MAX)
    ) {
      throw new BadRequestException('목표 거리는 0.1km(100m) ~ 100km 범위여야 합니다.', {
        description: '목표 거리는 0.1km ~ 100km 범위여야 합니다.',
      });
    }

    if (
      goalLimitMinutes !== undefined &&
      (goalLimitMinutes < Room.GOAL_LIMIT_MINUTES_MIN || goalLimitMinutes > Room.GOAL_LIMIT_MINUTES_MAX)
    ) {
      throw new BadRequestException('제한 시간은 5분 ~ 24시간(1440분) 범위여야 합니다.', {
        description: '제한 시간은 5분 ~ 24시간 범위여야 합니다.',
      });
    }
  }

  static create(args: Ctor) {
    Room.validGoalConditionRange(args);

    if (args.capacity < 2) {
      throw new BadRequestException('최소 인원은 2명입니다.', { description: '최소 인원은 2명입니다.' });
    }

    if (args.startOn <= today('YYYY-MM-DD HH:mm:ss')) {
      throw new BadRequestException('시작시간은 현재보다 미래여야합니다.', {
        description: '시작시간은 현재보다 미래여야합니다.',
      });
    }

    const room = new Room(args);
    room.join(args.hostUserId);

    return room;
  }

  changeSetting(args: {
    hostUserId: number;
    title?: string;
    capacity?: number;
    goalDistanceMeter?: number;
    goalLimitMinutes?: number;
  }) {
    if (this.hostUserId !== args.hostUserId) {
      throw new BadRequestException('방장만 설정을 변경할 수 있습니다.', {
        description: '방장만 설정을 변경할 수 있습니다.',
      });
    }

    if (this.status !== RoomStatus.RECRUITING) {
      throw new BadRequestException('현재 모집중인 방에만 설정을 변경할 수 있습니다.', {
        description: '현재 모집중인 방에만 설정을 변경할 수 있습니다.',
      });
    }

    if (args.capacity) {
      if (args.capacity < 2) {
        throw new BadRequestException('최소 인원은 2명입니다.', { description: '최소 인원은 2명입니다.' });
      }

      if (args.capacity < this.participants.length) {
        throw new BadRequestException('현재 인원수보다 적은 인원으로 변경할 수 없습니다.', {
          description: '현재 인원수보다 적은 인원으로 변경할 수 없습니다.',
        });
      }
    }

    Room.validGoalConditionRange({
      goalDistanceMeter: args.goalDistanceMeter,
      goalLimitMinutes: args.goalLimitMinutes,
    });

    const changed = this.stripUnchanged(args);

    if (!changed) {
      return;
    }

    Object.assign(this, changed);
  }

  join(userId: number) {
    if (this.status !== RoomStatus.RECRUITING) {
      throw new BadRequestException('현재 모집중인 방에만 참가가 가능합니다.', {
        description: '현재 모집중인 방에만 가능합니다.',
      });
    }

    if (this.participants.some((participant) => participant.userId === userId)) {
      throw new BadRequestException('이미 참가한 유저입니다.', { description: '이미 방에 참가한 유저입니다.' });
    }

    if (this.participants.length >= this.capacity) {
      throw new BadRequestException('방이 꽉 찼습니다.', { description: '이미 방이 꽉 찼습니다.' });
    }

    this.participants.push(Participant.create({ userId }));
  }

  exit(userId: number) {
    if (this.hostUserId === userId) {
      this.cancel(userId);
      return;
    }

    if (this.status !== RoomStatus.RECRUITING) {
      throw new BadRequestException('현재 모집중인 방에만 나갈 수 있습니다.', {
        description: '현재 모집중인 방에만 나갈 수 있습니다.',
      });
    }

    if (!this.participants.some((participant) => participant.userId === userId)) {
      return;
    }

    this.participants = this.participants.filter((participant) => participant.userId !== userId);
  }

  cancel(userId: number) {
    if (this.hostUserId !== userId) {
      throw new BadRequestException('방장만 방을 취소할 수 있습니다.', {
        description: '방장만 방을 취소할 수 있습니다.',
      });
    }

    if (this.status !== RoomStatus.RECRUITING) {
      throw new BadRequestException('현재 모집중인 방에만 취소할 수 있습니다.', {
        description: '현재 모집중인 방에만 취소할 수 있습니다.',
      });
    }

    this.status = RoomStatus.CANCELLED;
  }

  kick({ hostUserId, participantId }: { hostUserId: number; participantId: number }) {
    if (this.hostUserId !== hostUserId) {
      throw new BadRequestException('방장만 추방할 수 있습니다.', { description: '방장만 추방할 수 있습니다.' });
    }

    if (this.status !== RoomStatus.RECRUITING) {
      throw new BadRequestException('현재 모집중인 방에만 추방할 수 있습니다.', {
        description: '현재 모집중인 방에만 추방할 수 있습니다.',
      });
    }

    if (!this.participants.some((participant) => participant.id === participantId)) {
      return;
    }

    this.participants = this.participants.filter((participant) => participant.id !== participantId);
  }

  /** 모집 마감 시각 — 시작 10분 전. 이 시각부터 입장이 차단된다. */
  getRecruitCloseOn(): CalendarDate {
    return addMinutes(this.startOn, -Room.RECRUIT_CLOSE_BEFORE_MINUTES);
  }

  /** 제한 시간이 만료되는 시각 — startOn + goalLimitMinutes. 클라이언트 종료 카운트다운 기준. */
  getEndsOn(): CalendarDate {
    return addMinutes(this.startOn, this.goalLimitMinutes);
  }

  /**
   * 자동 모집 마감 — recruiting → ready. 단, 이 시점에 참가자가 2명 미만이면 경주가 성립하지 않아
   * cancelled로 전이한다. 이미 마감된 방에는 아무 일도 하지 않는다(멱등).
   *
   * @returns 상태가 실제로 바뀌었으면 전이 후 상태, 아니면 null
   */
  closeRecruiting(): RoomStatus | null {
    if (this.status !== RoomStatus.RECRUITING) {
      return null;
    }

    this.status = this.participants.length < Room.MIN_PARTICIPANT_COUNT ? RoomStatus.CANCELLED : RoomStatus.READY;

    return this.status;
  }

  /**
   * 경주 시작 — ready → live. 참가자를 일제히 running으로 전이해 동시 출발시킨다.
   * (클라이언트 카운트다운 기준은 서버가 브로드캐스트하는 startOn/endsOn이다.)
   */
  start(): boolean {
    if (this.status !== RoomStatus.READY) {
      return false;
    }

    this.status = RoomStatus.LIVE;
    this.participants.forEach((participant) => participant.start());

    return true;
  }

  /**
   * 목표 도달 처리 — 클라이언트가 보낸 도달 이벤트의 **서버 도착 순서**로 등수를 확정한다(재계산 없음).
   * 같은 시각(초)에 도달한 참가자는 공동 순위를 받는다. (예: 1, 1, 3)
   *
   * @returns 확정된 참가자. 이미 완주했거나 참가자가 아니면 null
   */
  reachGoal({
    userId,
    distanceMeter,
    finishedOn,
  }: {
    userId: number;
    distanceMeter: number;
    finishedOn: CalendarDate;
  }): Participant | null {
    if (this.status !== RoomStatus.LIVE) {
      return null;
    }

    const participant = this.participants.find((p) => p.userId === userId);

    if (!participant || participant.status !== ParticipantStatus.RUNNING) {
      return null;
    }

    // 목표 미만인 진행값으로 도달을 주장하면 무시한다(최소 방어선 — 서버 재검증은 2차 범위).
    if (distanceMeter < this.goalDistanceMeter) {
      return null;
    }

    participant.progress(distanceMeter);

    const finishedParticipants = this.participants.filter((p) => p.status === ParticipantStatus.FINISHED);
    // 동시 도달(같은 초) → 공동 순위. 아니면 완주자 수 + 1.
    const tied = finishedParticipants.find((p) => p.finishedOn === finishedOn);
    const finalRank = tied?.finalRank ?? finishedParticipants.length + 1;

    participant.finish({ finalRank, finishedOn });

    return participant;
  }

  /** 참가자 진행값 갱신. 참가 중이 아니면 무시하고 null을 반환한다. */
  updateProgress({ userId, distanceMeter }: { userId: number; distanceMeter: number }): Participant | null {
    const participant = this.participants.find((p) => p.userId === userId);

    if (!participant) {
      return null;
    }

    participant.progress(distanceMeter);

    return participant;
  }

  /**
   * 운영자 강제 취소 — 방장 권한과 무관하게 아직 끝나지 않은 방을 cancelled 로 돌린다.
   * 진행 중(live)이었다면 달리던 참가자를 모두 dnf 로 정리한다.
   */
  cancelByAdmin(cancelledOn: CalendarDate) {
    if (this.status === RoomStatus.FINISHED || this.status === RoomStatus.CANCELLED) {
      throw new BadRequestException('이미 종료되었거나 취소된 방입니다.', {
        description: '이미 종료되었거나 취소된 방입니다.',
      });
    }

    if (this.status === RoomStatus.LIVE) {
      this.participants
        .filter((participant) => participant.status === ParticipantStatus.RUNNING)
        .forEach((participant) => participant.quit(cancelledOn));
    }

    this.status = RoomStatus.CANCELLED;
    this.finishedOn = cancelledOn;
  }

  /** 경주 포기 — 해당 참가자를 dnf 로 돌린다. 최종 등수는 종료 시 finalize 가 매긴다. */
  quit({ userId, quitOn }: { userId: number; quitOn: CalendarDate }): Participant | null {
    if (this.status !== RoomStatus.LIVE) {
      return null;
    }

    const participant = this.participants.find((p) => p.userId === userId);

    if (!participant) {
      return null;
    }

    participant.quit(quitOn);

    return participant;
  }

  /** 제한 시간이 만료됐는지 — 기준 시각(now)이 endsOn을 지났는가. */
  isTimeUp(now: CalendarDate): boolean {
    return now >= this.getEndsOn();
  }

  /** 모든 참가자가 목표에 도달했는지 — 전원 완주 시 제한 시간 전이라도 경주를 끝낸다. */
  isAllFinished(): boolean {
    return this.participants.length > 0 && this.participants.every((p) => p.status === ParticipantStatus.FINISHED);
  }

  /**
   * 최종 순위 확정 + live → finished 전이.
   * 완주자는 도달 순으로 이미 받은 등수를 유지하고, 미완주자(dnf)는 **완주자 뒤에 누적 거리 내림차순**으로
   * 배치한다. 거리가 같으면 공동 순위(표준 경쟁 순위: 1, 2, 2, 4)를 준다.
   *
   * @returns 전이했으면 true, 이미 종료된 방이면 false
   */
  finalize(finishedOn: CalendarDate): boolean {
    if (this.status !== RoomStatus.LIVE) {
      return false;
    }

    const finishedCount = this.participants.filter((p) => p.status === ParticipantStatus.FINISHED).length;

    const unfinished = this.participants
      .filter((p) => p.status !== ParticipantStatus.FINISHED)
      .sort((a, b) => b.currentDistanceMeter - a.currentDistanceMeter);

    let finalRank = finishedCount;
    let previousDistanceMeter: number | null = null;

    unfinished.forEach((participant, index) => {
      if (previousDistanceMeter === null || participant.currentDistanceMeter !== previousDistanceMeter) {
        finalRank = finishedCount + index + 1;
      }

      previousDistanceMeter = participant.currentDistanceMeter;
      participant.markDnf({ finalRank, finishedOn });
    });

    this.status = RoomStatus.FINISHED;
    this.finishedOn = finishedOn;

    return true;
  }

  /** 최종 순위(등수 오름차순, 동률은 거리 내림차순)로 정렬한 참가자 목록. 결과·이력 화면 공통. */
  getRankedParticipants(): Participant[] {
    return [...this.participants].sort((a, b) => {
      const rankDiff = (a.finalRank ?? Number.MAX_SAFE_INTEGER) - (b.finalRank ?? Number.MAX_SAFE_INTEGER);
      return rankDiff !== 0 ? rankDiff : b.currentDistanceMeter - a.currentDistanceMeter;
    });
  }
}
