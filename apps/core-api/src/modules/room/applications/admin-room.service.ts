import { diffSeconds, today } from '@libs/date';
import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { PaginationOptions } from '@libs/utils';
import { UserRepository } from '@modules/user/infrastructure/user.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { keyBy } from 'lodash';
import { Participant } from '../domain/participant.entity';
import { Room, RoomStatus } from '../domain/room.entity';
import { RoomRepository } from '../infrastructure/room.repository';
import { AdminRoomListResponseDto, AdminRoomRetrieveResponseDto } from '../presentation/dto';

/**
 * 관리자 방(경주) 운영 유스케이스.
 * 일반 사용자 표면과 달리 모든 상태를 조회할 수 있고, 방장이 아니어도 강제 취소할 수 있다.
 */
@Injectable()
export class AdminRoomService extends DddService {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly userRepository: UserRepository
  ) {
    super();
  }

  async list(
    {
      statuses,
      searchKeys,
      searchValue,
    }: {
      statuses?: RoomStatus[];
      searchKeys?: string[];
      searchValue?: string;
    },
    options?: PaginationOptions
  ) {
    const [rooms, total] = await this.roomRepository.search({ statuses, searchKeys, searchValue }, options);

    // 목록의 인원수를 방마다 재조회하지 않도록 한 번에 센다.
    const participants = await this.roomRepository.findParticipants({ roomIds: rooms.map((room) => room.id) });
    const hostUsers = await this.userRepository.find({ ids: rooms.map((room) => room.hostUserId) });
    const hostById = keyBy(hostUsers, 'id');

    return {
      items: rooms.map((room) =>
        room.toInstance(AdminRoomListResponseDto, {
          currentParticipantCount: participants.filter((p) => p.roomId === room.id).length,
          hostNickname: hostById[room.hostUserId]?.nickname ?? null,
          endsOn: room.getEndsOn(),
        })
      ),
      total,
    };
  }

  /**
   * 개인 기록 파생값 — 경과 시간(초)과 평균 페이스(초/km).
   * 저장하지 않고 Room.startOn 과 Participant 값에서 매번 계산한다(앱 결과 화면과 같은 규칙).
   */
  private static toRecord(room: Room, participant: Participant) {
    const elapsedSeconds = participant.finishedOn ? diffSeconds(participant.finishedOn, room.startOn) : null;

    const paceSecondsPerKm =
      elapsedSeconds !== null && elapsedSeconds > 0 && participant.currentDistanceMeter > 0
        ? Math.round(elapsedSeconds / (participant.currentDistanceMeter / 1000))
        : null;

    return { elapsedSeconds, paceSecondsPerKm };
  }

  async retrieve({ id }: { id: number }) {
    const [room] = await this.roomRepository.find({ id }, { relations: { participants: true } });

    if (!room) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    const users = await this.userRepository.find({
      ids: [...new Set([room.hostUserId, ...room.participants.map((p) => p.userId)])],
    });
    const userById = keyBy(users, 'id');

    return room.toInstance(AdminRoomRetrieveResponseDto, {
      hostNickname: userById[room.hostUserId]?.nickname ?? null,
      endsOn: room.getEndsOn(),
      currentParticipantCount: room.participants.length,
      participants: room.getRankedParticipants().map((participant) => ({
        id: participant.id,
        userId: participant.userId,
        nickname: userById[participant.userId]?.nickname ?? null,
        status: participant.status,
        currentDistanceMeter: participant.currentDistanceMeter,
        finalRank: participant.finalRank,
        joinOn: participant.joinOn,
        finishedOn: participant.finishedOn,
        ...AdminRoomService.toRecord(room, participant),
      })),
    });
  }

  /**
   * 방 강제 취소 — 운영자가 문제 있는 방을 닫는다.
   * 방장 권한 검사를 하는 도메인 `cancel()` 대신, 아직 끝나지 않은 방이면 상태만 cancelled 로 돌린다.
   */
  @Transactional()
  async cancel({ id }: { id: number }) {
    const [room] = await this.roomRepository.find({ id }, { relations: { participants: true } });

    if (!room) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    room.cancelByAdmin(today('YYYY-MM-DD HH:mm:ss'));

    await this.roomRepository.save([room]);

    return { id: room.id };
  }
}
