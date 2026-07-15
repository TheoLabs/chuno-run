import { DddAggregate } from '@libs/ddd';
import { CalendarDate } from '@types';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Participant } from './participant.entity';
import { BadRequestException } from '@nestjs/common';
import { today } from '@libs/date';

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
}
