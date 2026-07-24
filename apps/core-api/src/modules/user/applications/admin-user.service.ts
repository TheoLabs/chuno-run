import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { PaginationOptions } from '@libs/utils';
import { ParticipantStatus } from '@modules/room/domain/participant.entity';
import { RoomRepository } from '@modules/room/infrastructure/room.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { User, UserStatus } from '../domain/user.entity';
import { UserRepository } from '../infrastructure/user.repository';
import { AdminUserListResponseDto, AdminUserRetrieveResponseDto } from '../presentation/dto';

/**
 * 관리자 사용자 운영 유스케이스 — CS·제재를 코드/DB 조작 없이 처리하기 위한 조회와 상태 변경.
 */
@Injectable()
export class AdminUserService extends DddService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roomRepository: RoomRepository
  ) {
    super();
  }

  async list(
    {
      statuses,
      searchKeys,
      searchValue,
    }: {
      statuses?: UserStatus[];
      searchKeys?: string[];
      searchValue?: string;
    },
    options?: PaginationOptions
  ) {
    const [users, total] = await this.userRepository.search({ statuses, searchKeys, searchValue }, options);

    // 목록의 참가 횟수를 사용자마다 재조회하지 않도록, 이 페이지의 사용자 것만 한 번에 읽는다.
    const participants =
      users.length > 0 ? await this.roomRepository.findParticipants({ userIds: users.map((u) => u.id) }) : [];
    const participantCountByUserId = participants.reduce<Record<number, number>>((acc, participant) => {
      acc[participant.userId] = (acc[participant.userId] ?? 0) + 1;
      return acc;
    }, {});

    return {
      items: users.map((user) =>
        user.toInstance(AdminUserListResponseDto, {
          raceCount: participantCountByUserId[user.id] ?? 0,
        })
      ),
      total,
    };
  }

  /** 사용자 상세 — 프로필·상태·가입 정보에 참가 이력 요약을 덧붙인다. */
  async retrieve({ id }: { id: number }) {
    const user = await this.getOne(id);

    const participants = await this.roomRepository.findParticipants({ userId: id });
    const finishedCount = participants.filter((p) => p.status === ParticipantStatus.FINISHED).length;

    return user.toInstance(AdminUserRetrieveResponseDto, {
      raceCount: participants.length,
      finishedCount,
      winCount: participants.filter((p) => p.finalRank === 1 && p.status === ParticipantStatus.FINISHED).length,
      totalRunningDistanceMeter: participants.reduce((acc, p) => acc + p.currentDistanceMeter, 0),
      completedRate: participants.length === 0 ? 0 : Math.round((finishedCount / participants.length) * 100),
    });
  }

  /** 이용 정지 — active → suspended. */
  @Transactional()
  async suspend({ id }: { id: number }) {
    const user = await this.getOne(id);

    user.suspend();

    await this.userRepository.save([user]);
  }

  /** 정지 해제 — suspended → active. */
  @Transactional()
  async activate({ id }: { id: number }) {
    const user = await this.getOne(id);

    user.activate();

    await this.userRepository.save([user]);
  }

  private async getOne(id: number): Promise<User> {
    const [user] = await this.userRepository.find({ ids: [id] });

    if (!user) {
      throw new NotFoundException('존재하지 않는 사용자입니다.');
    }

    return user;
  }
}
