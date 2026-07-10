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
  KICKED = 'kicked',
}

type Ctor = {
  userId: number;
};

@Entity()
@Unique('unique_room_id_user_id', ['roomId', 'userId'])
@Index('idx_participant_user_id', ['userId '])
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
    }
  }

  static create(args: Ctor) {
    return new Participant(args);
  }
}
