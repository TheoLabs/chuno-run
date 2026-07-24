import { addMinutes, today } from '@libs/date';
import { DddService } from '@libs/ddd';
import { ParticipantStatus } from '@modules/room/domain/participant.entity';
import { RoomStatus } from '@modules/room/domain/room.entity';
import { RoomRepository } from '@modules/room/infrastructure/room.repository';
import { UserRepository } from '@modules/user/infrastructure/user.repository';
import { UserStatus } from '@modules/user/domain/user.entity';
import { Injectable } from '@nestjs/common';
import { CalendarDate } from '@types';
import { keyBy } from 'lodash';
import { AdminDashboardResponseDto } from '../presentation/dto';

/** 완주율 집계 구간 — 최근 7일. */
const COMPLETION_WINDOW_DAYS = 7;

/**
 * 백오피스 대시보드 지표 집계.
 * 관리자가 로그인 직후 서비스 상태를 한눈에 보도록 가입자·방·경주 지표를 한 번에 계산한다.
 */
@Injectable()
export class AdminDashboardService extends DddService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roomRepository: RoomRepository
  ) {
    super();
  }

  async summary() {
    const now = today('YYYY-MM-DD HH:mm:ss');
    const startOfToday = `${today()} 00:00:00` as CalendarDate;
    const windowStart = addMinutes(startOfToday, -COMPLETION_WINDOW_DAYS * 24 * 60);

    const [totalUserCount, activeUserCount, suspendedUserCount, onboardingUserCount] = await Promise.all([
      this.userRepository.count({}),
      this.userRepository.count({ statuses: [UserStatus.ACTIVE] }),
      this.userRepository.count({ statuses: [UserStatus.SUSPENDED] }),
      this.userRepository.count({ statuses: [UserStatus.ONBOARDING] }),
    ]);

    const roomCountByStatus = await this.countRoomsByStatus();

    // 오늘 시작하는(했던) 경주 — 상태와 무관하게 startOn 기준으로 센다.
    const todayRooms = await this.roomRepository.find({ minStartOn: startOfToday });

    // 완주율은 최근 7일에 끝난 경주의 참가자 기준(완주 / 전체)으로 계산한다.
    const recentFinishedRooms = await this.roomRepository.find({
      statuses: [RoomStatus.FINISHED],
      minStartOn: windowStart,
    });

    const recentParticipants =
      recentFinishedRooms.length > 0
        ? await this.roomRepository.findParticipants({ roomIds: recentFinishedRooms.map((room) => room.id) })
        : [];

    const finishedParticipantCount = recentParticipants.filter(
      (participant) => participant.status === ParticipantStatus.FINISHED
    ).length;

    const recentRooms = await this.loadRecentRooms();

    return {
      serverTime: now,
      totalUserCount,
      activeUserCount,
      suspendedUserCount,
      onboardingUserCount,
      /** 아직 끝나지 않은 방 — 모집중 + 마감(대기) + 진행중. */
      activeRoomCount:
        roomCountByStatus[RoomStatus.RECRUITING] +
        roomCountByStatus[RoomStatus.READY] +
        roomCountByStatus[RoomStatus.LIVE],
      roomCountByStatus,
      todayRaceCount: todayRooms.length,
      completionRate:
        recentParticipants.length === 0 ? 0 : Math.round((finishedParticipantCount / recentParticipants.length) * 100),
      completionWindowDays: COMPLETION_WINDOW_DAYS,
      recentRooms,
    } satisfies AdminDashboardResponseDto;
  }

  private async countRoomsByStatus(): Promise<Record<RoomStatus, number>> {
    const statuses = Object.values(RoomStatus);
    const counts = await Promise.all(statuses.map((status) => this.roomRepository.count({ statuses: [status] })));

    return statuses.reduce(
      (acc, status, index) => ({ ...acc, [status]: counts[index] }),
      {} as Record<RoomStatus, number>
    );
  }

  /** 최근 경주 테이블 — 시작 시각 내림차순 상위 10건. */
  private async loadRecentRooms() {
    const rooms = await this.roomRepository.find(
      {},
      { options: { page: 1, limit: 10, sort: 'startOn', order: 'DESC' as never }, relations: { participants: true } }
    );

    const hosts = await this.userRepository.find({ ids: rooms.map((room) => room.hostUserId) });
    const hostById = keyBy(hosts, 'id');

    return rooms.map((room) => ({
      id: room.id,
      title: room.title,
      status: room.status,
      hostNickname: hostById[room.hostUserId]?.nickname ?? null,
      goalDistanceMeter: room.goalDistanceMeter,
      startOn: room.startOn,
      participantCount: room.participants.length,
    }));
  }
}
