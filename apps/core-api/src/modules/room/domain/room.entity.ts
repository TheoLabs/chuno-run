import { DddAggregate } from '@libs/ddd';
import { CalendarDate } from '@types';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Participant } from './participant.entity';

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

  @Column({ comment: '게임 종료 시간 (YYYY-MM-DD HH:mm:ss)' })
  finishedOn: CalendarDate;

  @OneToMany(() => Participant, (participant) => participant.room, { cascade: true, orphanedRowAction: 'delete' })
  participants: Participant[];

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

  static create(args: Ctor) {
    return new Room(args);
  }
}
