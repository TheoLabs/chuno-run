import { DddService } from '@libs/ddd';
import { PaginationOptions } from '@libs/utils';
import { UserRepository } from '@modules/user/infrastructure/user.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { keyBy } from 'lodash';
import { CheatType } from '../domain/cheat-detection.entity';
import { Participant } from '../domain/participant.entity';
import { CheatDetectionRepository } from '../infrastructure/cheat-detection.repository';
import { RoomRepository } from '../infrastructure/room.repository';
import { AdminCheatDetectionResponseDto } from '../presentation/dto';

/**
 * 관리자 부정행위 탐지 이력 유스케이스. 운영자가 이력을 보고 필요 시 사용자 상세에서 제재한다.
 * 원시 좌표를 보존하지 않으므로 판단 근거는 거리·시간 관측값(observedSpeed·detail 등)이다.
 */
@Injectable()
export class AdminCheatDetectionService extends DddService {
  constructor(
    private readonly cheatDetectionRepository: CheatDetectionRepository,
    private readonly roomRepository: RoomRepository,
    private readonly userRepository: UserRepository
  ) {
    super();
  }

  async list(
    { types, searchKeys, searchValue }: { types?: CheatType[]; searchKeys?: string[]; searchValue?: string },
    options?: PaginationOptions
  ) {
    const [detections, total] = await this.cheatDetectionRepository.search({ types, searchKeys, searchValue }, options);

    const context = await this.loadContext(detections.map((detection) => detection.participantId));

    return {
      items: detections.map((detection) =>
        detection.toInstance(AdminCheatDetectionResponseDto, context(detection.participantId))
      ),
      total,
    };
  }

  async retrieve({ id }: { id: number }) {
    const [detection] = await this.cheatDetectionRepository.find({ id });

    if (!detection) {
      throw new NotFoundException('존재하지 않는 탐지 이력입니다.');
    }

    const context = await this.loadContext([detection.participantId]);

    return detection.toInstance(AdminCheatDetectionResponseDto, context(detection.participantId));
  }

  /**
   * 참가자 → 사용자·방 표시 정보를 한 번에 모아, participantId로 조회하는 함수를 돌려준다.
   * 목록의 N+1 조회를 막기 위해 참가자·방·사용자를 각각 한 번씩만 읽는다.
   */
  private async loadContext(participantIds: number[]) {
    const uniqueIds = [...new Set(participantIds)];

    const targetParticipants =
      uniqueIds.length > 0 ? await this.roomRepository.findParticipants({ ids: uniqueIds }) : [];
    const byId = keyBy(targetParticipants, 'id');

    const [rooms, users] = await Promise.all([
      this.roomRepository.find({ ids: [...new Set(targetParticipants.map((p) => p.roomId))] }),
      this.userRepository.find({ ids: [...new Set(targetParticipants.map((p) => p.userId))] }),
    ]);

    const roomById = keyBy(rooms, 'id');
    const userById = keyBy(users, 'id');

    return (participantId: number) => {
      const participant = byId[participantId];
      const room = participant ? roomById[participant.roomId] : undefined;
      const user = participant ? userById[participant.userId] : undefined;

      return {
        userId: user?.id ?? null,
        nickname: user?.nickname ?? null,
        roomId: room?.id ?? null,
        roomTitle: room?.title ?? null,
      };
    };
  }
}
