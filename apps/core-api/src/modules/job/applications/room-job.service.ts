import { addMinutes, today } from '@chuno/date';
import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { NotificationService, RaceNotificationType } from '@modules/push/applications/notification.service';
import { Room, RoomStatus } from '@modules/room/domain/room.entity';
import { RoomRepository } from '@modules/room/infrastructure/room.repository';
import { Injectable, Logger } from '@nestjs/common';
import { CalendarDate } from '@types';

/** 한 번의 전이 실행에서 무슨 일이 있었는지 — 스케줄러 로그·응답용. */
export interface RoomTransitionResult {
  /** recruiting → ready 로 마감된 방 id */
  closedRoomIds: number[];
  /** 인원 미달로 recruiting → cancelled 된 방 id */
  cancelledRoomIds: number[];
  /** ready → live 로 출발한 방 id */
  startedRoomIds: number[];
  /** 제한 시간 만료로 live → finished 된 방 id */
  finishedRoomIds: number[];
}

/**
 * 시작 시간 기준 방 상태 자동 전이 잡.
 *
 * 시작 10분 전 모집 마감(→ready, 인원 미달이면 →cancelled), 시작 시각 도달 시 출발(→live),
 * 제한 시간 만료 시 종료(→finished)를 처리한다. 짧은 주기로 반복 실행되며, 실행이 누락된
 * 구간이 있어도 "기준 시각까지 도달한 방"을 전부 조회하므로 다음 실행에서 catch-up 된다.
 */
@Injectable()
export class AdminRoomJobService extends DddService {
  private readonly logger = new Logger(AdminRoomJobService.name);

  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly notificationService: NotificationService
  ) {
    super();
  }

  /**
   * 방 전이 + 전이에 맞는 푸시 알림. 전이 트랜잭션을 먼저 커밋한 뒤(commit) 알림을 보낸다 —
   * 알림은 트랜잭션 밖에서 처리해 중첩 @Transactional 문제를 피하고, 발송 실패가 전이를 되돌리지 않게 한다.
   */
  async transitionRoomsAndNotify({ scheduledOn }: { scheduledOn?: CalendarDate } = {}): Promise<RoomTransitionResult> {
    const result = await this.transitionRooms({ scheduledOn });
    await this.notifyTransitions(result);
    return result;
  }

  /**
   * 전이 결과에 따라 참가자에게 알림을 보낸다.
   * - closed(ready) → 시작 임박 · started(live) → 시작 · finished → 종료.
   * 취소(cancelled)는 별도 알림 종류가 없어 보내지 않는다(대기실 폴링으로 감지).
   */
  async notifyTransitions(result: RoomTransitionResult): Promise<void> {
    const plans: { type: RaceNotificationType; roomIds: number[] }[] = [
      { type: 'startingSoon', roomIds: result.closedRoomIds },
      { type: 'started', roomIds: result.startedRoomIds },
      { type: 'finished', roomIds: result.finishedRoomIds },
    ];

    const allRoomIds = [...new Set(plans.flatMap((plan) => plan.roomIds))];
    if (allRoomIds.length === 0) {
      return;
    }

    const rooms = await this.roomRepository.find({ ids: allRoomIds }, { relations: { participants: true } });
    const roomById = new Map(rooms.map((room) => [room.id, room]));

    for (const plan of plans) {
      for (const roomId of plan.roomIds) {
        const room = roomById.get(roomId);
        if (!room) continue;

        await this.notificationService.notifyRaceEvent({
          type: plan.type,
          userIds: room.participants.map((participant) => participant.userId),
          roomId: room.id,
          roomTitle: room.title,
        });
      }
    }
  }

  @Transactional()
  async transitionRooms({ scheduledOn }: { scheduledOn?: CalendarDate } = {}): Promise<RoomTransitionResult> {
    const now = scheduledOn || today('YYYY-MM-DD HH:mm:ss');

    // 모집 마감 대상 기준 — 시작이 (now + 10분) 이내로 다가온 방.
    const recruitCloseUntil = addMinutes(now, Room.RECRUIT_CLOSE_BEFORE_MINUTES);

    const result: RoomTransitionResult = {
      closedRoomIds: [],
      cancelledRoomIds: [],
      startedRoomIds: [],
      finishedRoomIds: [],
    };

    const rooms = new Map<number, Room>();

    // 1) 모집 마감: recruiting 이면서 시작이 10분 앞으로 다가온 방
    const recruitingRooms = await this.roomRepository.find(
      { statuses: [RoomStatus.RECRUITING], maxStartOn: recruitCloseUntil },
      { relations: { participants: true } }
    );

    recruitingRooms.forEach((room) => {
      const transitioned = room.closeRecruiting();

      if (transitioned === RoomStatus.READY) {
        result.closedRoomIds.push(room.id);
      } else if (transitioned === RoomStatus.CANCELLED) {
        result.cancelledRoomIds.push(room.id);
      }

      rooms.set(room.id, room);
    });

    // 2) 출발: ready 이면서 시작 시각이 지난 방. 방금 1)에서 ready 가 된 방도 같은 실행에서 함께 본다.
    const readyRooms = await this.roomRepository.find(
      { statuses: [RoomStatus.READY] },
      { relations: { participants: true } }
    );

    readyRooms.forEach((room) => rooms.set(room.id, room));

    [...rooms.values()]
      .filter((room) => room.status === RoomStatus.READY && room.startOn <= now)
      .forEach((room) => {
        if (room.start()) {
          result.startedRoomIds.push(room.id);
        }
      });

    // 3) 종료: 제한 시간이 만료된 live 방. 참가자가 모두 앱을 닫아 WS 종료 신호가 없어도 여기서 확정된다.
    const liveRooms = await this.roomRepository.find(
      { statuses: [RoomStatus.LIVE] },
      { relations: { participants: true } }
    );

    liveRooms.forEach((room) => rooms.set(room.id, room));

    [...rooms.values()]
      .filter((room) => room.status === RoomStatus.LIVE && room.isTimeUp(now))
      .forEach((room) => {
        if (room.finalize(room.getEndsOn())) {
          result.finishedRoomIds.push(room.id);
        }
      });

    const changed = [...rooms.values()].filter(
      (room) =>
        result.closedRoomIds.includes(room.id) ||
        result.cancelledRoomIds.includes(room.id) ||
        result.startedRoomIds.includes(room.id) ||
        result.finishedRoomIds.includes(room.id)
    );

    if (changed.length > 0) {
      await this.roomRepository.save(changed);
    }

    return result;
  }
}
