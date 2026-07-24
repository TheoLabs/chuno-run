import { diffSeconds, today } from '@libs/date';
import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { OrderType, PaginationOptions } from '@libs/utils';
import { User } from '@modules/user/domain/user.entity';
import { UserRepository } from '@modules/user/infrastructure/user.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CalendarDate } from '@types';
import { keyBy } from 'lodash';
import { CheatAction, CheatDetection } from '../domain/cheat-detection.entity';
import { Participant, ParticipantStatus } from '../domain/participant.entity';
import { Room, RoomStatus } from '../domain/room.entity';
import { CheatDetectionRepository } from '../infrastructure/cheat-detection.repository';
import { RoomRepository } from '../infrastructure/room.repository';
import { GeneralRaceHistoryResponseDto, GeneralRaceResultResponseDto } from '../presentation/dto';
import { RaceRevalidationService, RevalidationVerdict } from './race-revalidation.service';

/** 리더보드 한 줄 — 실시간 순위는 휘발성이라 저장하지 않고 브로드캐스트로만 전달한다. */
export interface RaceLeaderboardEntry {
  participantId: number;
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  /** 누적 거리(m). 클라이언트가 계산해 보낸 값을 그대로 릴레이한다. */
  distanceMeter: number;
  status: ParticipantStatus;
  /** 거리 기준 실시간 순위(1-base, 동률은 공동 순위). 경주 중에만 의미가 있다. */
  rank: number;
  /** 확정된 최종 등수. 완주·종료 전에는 null. */
  finalRank: number | null;
  finishedOn: CalendarDate | null;
}

/** 경주 화면이 한 번에 필요한 전체 상태. 최초 접속·재접속 시 그대로 내려준다. */
export interface RaceSnapshot {
  roomId: number;
  title: string;
  status: RoomStatus;
  goalDistanceMeter: number;
  goalLimitMinutes: number;
  /** 서버 기준 출발 시각. 클라이언트는 serverTime 과의 차이로 시계 오차를 보정한다. */
  startOn: CalendarDate;
  /** 서버 기준 종료 시각(startOn + 제한 시간). */
  endsOn: CalendarDate;
  /** 이 스냅샷을 만든 서버 시각. 클라이언트 시계 오프셋 계산의 기준점. */
  serverTime: CalendarDate;
  leaderboard: RaceLeaderboardEntry[];
}

/**
 * 경주(러닝) 세션 유스케이스.
 *
 * 판정 모델은 **서버 릴레이**다 — 거리와 목표 도달은 클라이언트가 GPS로 계산해 보내고,
 * 서버는 재계산 없이 진행값을 반영하고 도달 이벤트의 **도착 순서로 등수만 확정**한다.
 * 원시 GPS 좌표는 보존하지 않는다(TrackPoint 미도입).
 */
@Injectable()
export class GeneralRaceService extends DddService {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly userRepository: UserRepository,
    private readonly revalidationService: RaceRevalidationService,
    private readonly cheatDetectionRepository: CheatDetectionRepository
  ) {
    super();
  }

  /** 경주 화면용 방 조회. 참가자를 함께 읽는다. */
  private async loadRoom(roomId: number): Promise<Room> {
    const [room] = await this.roomRepository.find({ id: roomId }, { relations: { participants: true } });

    if (!room) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    return room;
  }

  /** 참가자 userId → 표시용 사용자 정보. 리더보드 닉네임/프로필에 쓴다. */
  private async loadParticipantUsers(room: Room) {
    const users = await this.userRepository.find({ ids: room.participants.map((p) => p.userId) });
    return keyBy(users, 'id');
  }

  /**
   * 거리 내림차순 실시간 순위를 매긴다. 동률은 공동 순위(표준 경쟁 순위: 1, 2, 2, 4).
   * 완주자는 확정된 finalRank 를 그대로 순위로 쓴다 — 이미 도달 순으로 확정된 값이 우선이다.
   */
  private toLeaderboard(
    room: Room,
    userById: Record<number, { nickname: string | null; profileImageUrl: string | null }>
  ) {
    const sorted = [...room.participants].sort((a, b) => {
      const aRank = a.finalRank ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.finalRank ?? Number.MAX_SAFE_INTEGER;
      return aRank !== bRank ? aRank - bRank : b.currentDistanceMeter - a.currentDistanceMeter;
    });

    let rank = 0;
    let previousKey: string | null = null;

    return sorted.map((participant, index): RaceLeaderboardEntry => {
      const key = `${participant.finalRank ?? ''}:${participant.currentDistanceMeter}`;

      if (key !== previousKey) {
        rank = index + 1;
      }
      previousKey = key;

      const user = userById[participant.userId];

      return {
        participantId: participant.id,
        userId: participant.userId,
        nickname: user?.nickname ?? '알 수 없음',
        profileImageUrl: user?.profileImageUrl ?? null,
        distanceMeter: participant.currentDistanceMeter,
        status: participant.status,
        rank: participant.finalRank ?? rank,
        finalRank: participant.finalRank,
        finishedOn: participant.finishedOn,
      };
    });
  }

  private async toSnapshot(room: Room): Promise<RaceSnapshot> {
    const userById = await this.loadParticipantUsers(room);

    return {
      roomId: room.id,
      title: room.title,
      status: room.status,
      goalDistanceMeter: room.goalDistanceMeter,
      goalLimitMinutes: room.goalLimitMinutes,
      startOn: room.startOn,
      endsOn: room.getEndsOn(),
      serverTime: today('YYYY-MM-DD HH:mm:ss'),
      leaderboard: this.toLeaderboard(room, userById),
    };
  }

  /** 이 사용자가 방의 참가자인지 확인하고 참가자 row 를 돌려준다. */
  private findParticipant(room: Room, userId: number): Participant | null {
    return room.participants.find((p) => p.userId === userId) ?? null;
  }

  /** 방 참가자인지 검사한다. 참가자가 아니면 소켓 연결을 거절하는 데 쓴다. */
  async assertParticipant({ roomId, userId }: { roomId: number; userId: number }) {
    const room = await this.loadRoom(roomId);

    if (!this.findParticipant(room, userId)) {
      throw new NotFoundException('이 방의 참가자가 아닙니다.');
    }

    return room;
  }

  /** 현재 상태 스냅샷 — 최초 접속·재접속 시 리더보드를 통째로 복구한다. */
  async getSnapshot(roomId: number): Promise<RaceSnapshot> {
    return this.toSnapshot(await this.loadRoom(roomId));
  }

  /**
   * [2차] 진행 중 경주 복귀 — 내가 running 상태로 참가 중인 방을 찾아 복귀 스냅샷을 준다.
   * 종료 시각(endsOn)이 지난 방은 이미 끝난 것이므로 종료 처리하고 복귀 불가로 응답한다.
   *
   * @returns 복귀 가능하면 { resumable:true, snapshot }, 없거나 시한 초과면 resumable:false
   */
  @Transactional()
  async getActiveRace({
    user,
  }: {
    user: User;
  }): Promise<{ resumable: boolean; snapshot: RaceSnapshot | null; reason?: 'expired' | 'none' }> {
    const now = today('YYYY-MM-DD HH:mm:ss');

    // 내가 running 중인 참가 기록 → 그 방들 중 live 인 것.
    const myParticipants = await this.roomRepository.findParticipants({
      userId: user.id,
      statuses: [ParticipantStatus.RUNNING],
    });

    if (myParticipants.length === 0) {
      return { resumable: false, snapshot: null, reason: 'none' };
    }

    const [room] = await this.roomRepository.find(
      { ids: myParticipants.map((p) => p.roomId), statuses: [RoomStatus.LIVE] },
      { relations: { participants: true }, options: { sort: 'startOn', order: 'DESC' as never } }
    );

    if (!room) {
      return { resumable: false, snapshot: null, reason: 'none' };
    }

    // 종료 시각이 지났으면 복귀 대신 종료 처리.
    if (room.isTimeUp(now)) {
      room.finalize(room.getEndsOn());
      await this.roomRepository.save([room]);
      return { resumable: false, snapshot: await this.toSnapshot(room), reason: 'expired' };
    }

    return { resumable: true, snapshot: await this.toSnapshot(room) };
  }

  /**
   * [2차] 복귀 재동기화 — 기기가 보관한 누적 거리를 정합성 검사를 거쳐 반영한다.
   * 끊긴 동안의 거리를 한 번에 메우되, 조작 값은 progress와 동일한 기준으로 반려/무효 처리한다.
   * (progress가 트랜잭션을 관리하므로 여기서 다시 감싸지 않는다.)
   */
  async resync({
    roomId,
    userId,
    distanceMeter,
  }: {
    roomId: number;
    userId: number;
    distanceMeter: number;
  }): Promise<RaceSnapshot> {
    return this.progress({ roomId, userId, distanceMeter });
  }

  /**
   * 방 하나에 대해 시각 기반 전이를 적용한다 — 모집 마감 → 출발 → (제한 시간 만료·전원 완주 시) 종료.
   * 게이트웨이가 접속 중인 방에 대해 짧은 주기로 호출해 카운트다운과 서버 상태를 맞춘다.
   * (접속자가 없는 방은 스케줄러 잡이 같은 전이를 처리한다.)
   *
   * @returns 상태가 바뀌었으면 changed=true. 호출부는 이때만 브로드캐스트하면 된다.
   */
  @Transactional()
  async syncRoom(roomId: number): Promise<{ snapshot: RaceSnapshot; changed: boolean }> {
    const room = await this.loadRoom(roomId);
    const now = today('YYYY-MM-DD HH:mm:ss');
    const before = room.status;

    if (room.status === RoomStatus.RECRUITING && now >= room.getRecruitCloseOn()) {
      room.closeRecruiting();
    }

    if (room.status === RoomStatus.READY && now >= room.startOn) {
      room.start();
    }

    if (room.status === RoomStatus.LIVE && (room.isAllFinished() || room.isTimeUp(now))) {
      // 제한 시간이 지나 끝났다면 종료 시각은 정확히 endsOn 으로 못박는다(틱 지연이 기록에 새지 않게).
      room.finalize(room.isTimeUp(now) ? room.getEndsOn() : now);
    }

    const changed = room.status !== before;

    if (changed) {
      await this.roomRepository.save([room]);
    }

    return { snapshot: await this.toSnapshot(room), changed };
  }

  /**
   * 진행값 수신 — 클라이언트가 계산한 누적 거리를 **서버 정합성 검사(2차)** 로 거른 뒤 반영한다.
   * 통과분만 currentDistance·lastProgressOn에 반영하고, 반려되면 이전 값을 유지한다(순위 미반영).
   * 재연결 직후의 재동기화도 같은 경로를 쓴다(거리는 뒤로 가지 않으므로 안전).
   */
  @Transactional()
  async progress({
    roomId,
    userId,
    distanceMeter,
    clientElapsedSeconds,
  }: {
    roomId: number;
    userId: number;
    distanceMeter: number;
    clientElapsedSeconds?: number;
  }): Promise<RaceSnapshot> {
    const room = await this.loadRoom(roomId);
    const now = today('YYYY-MM-DD HH:mm:ss');

    if (room.status !== RoomStatus.LIVE) {
      return this.toSnapshot(room);
    }

    const participant = room.participants.find((p) => p.userId === userId);

    if (!participant || participant.status !== ParticipantStatus.RUNNING) {
      return this.toSnapshot(room);
    }

    const verdict = this.revalidationService.validateProgress({
      participant,
      reportedDistanceMeter: distanceMeter,
      now,
      clientElapsedSeconds,
      raceStartOn: room.startOn,
    });

    if (verdict.accepted) {
      participant.progress(distanceMeter, now);
      await this.roomRepository.save([room]);
      return this.toSnapshot(room);
    }

    // 반려/무효 — 탐지 이력을 남기고, 무효면 기록을 dnf 로 실격 처리한다.
    await this.applyDetection({ room, participant, distanceMeter, verdict, now });

    return this.toSnapshot(room);
  }

  /**
   * 목표 도달 — **재검증(불가능한 완주 차단)** 후 서버 도착 순서로 등수를 확정한다.
   * 같은 초에 도달하면 공동 순위. 이 도달로 전원이 완주했다면 즉시 최종 순위를 확정하고 방을 finished 로 전이한다.
   */
  @Transactional()
  async reachGoal({
    roomId,
    userId,
    distanceMeter,
  }: {
    roomId: number;
    userId: number;
    distanceMeter: number;
  }): Promise<RaceSnapshot> {
    const room = await this.loadRoom(roomId);
    const now = today('YYYY-MM-DD HH:mm:ss');

    const candidate = room.participants.find((p) => p.userId === userId);

    // 도달 재검증 — 출발부터 도달까지 평균 페이스가 인간 하한보다 빠르면 무효 처리하고 도달을 확정하지 않는다.
    if (candidate && candidate.status === ParticipantStatus.RUNNING && distanceMeter >= room.goalDistanceMeter) {
      const verdict = this.revalidationService.validateGoalReach({
        reachedDistanceMeter: distanceMeter,
        now,
        raceStartOn: room.startOn,
      });

      if (!verdict.accepted) {
        await this.applyDetection({ room, participant: candidate, distanceMeter, verdict, now });
        return this.toSnapshot(room);
      }
    }

    const participant = room.reachGoal({ userId, distanceMeter, finishedOn: now });

    if (!participant) {
      return this.toSnapshot(room);
    }

    if (room.isAllFinished()) {
      room.finalize(now);
    }

    await this.roomRepository.save([room]);

    return this.toSnapshot(room);
  }

  /**
   * 탐지 이력을 저장하고 조치를 적용한다.
   * - voided: 참가자 기록을 무효(dnf)로 실격 처리하고, 전원이 더는 달리지 않으면 경주를 종료한다.
   * - rejected: 거리 반영 없이 이력만 남긴다(경주는 계속).
   */
  private async applyDetection({
    room,
    participant,
    distanceMeter,
    verdict,
    now,
  }: {
    room: Room;
    participant: Participant;
    distanceMeter: number;
    verdict: RevalidationVerdict;
    now: CalendarDate;
  }) {
    const detection = verdict.detection!;

    if (detection.action === CheatAction.VOIDED) {
      participant.voidRecord(now);

      if (room.status === RoomStatus.LIVE && room.participants.every((p) => p.status !== ParticipantStatus.RUNNING)) {
        room.finalize(now);
      }

      await this.roomRepository.save([room]);
    }

    // participant.id 는 room 저장 후(신규면) 채워지므로, voided 저장 뒤 탐지 이력을 남긴다.
    await this.cheatDetectionRepository.save([
      CheatDetection.create({
        participantId: participant.id,
        type: detection.type,
        action: detection.action,
        reportedDistanceMeter: Math.trunc(distanceMeter),
        acceptedDistanceMeter: participant.currentDistanceMeter,
        observedSpeedMps: detection.observedSpeedMps ?? null,
        thresholdSpeedMps: detection.thresholdSpeedMps ?? null,
        intervalSeconds: detection.intervalSeconds ?? null,
        detail: detection.detail,
      }),
    ]);
  }

  /**
   * 경주 포기(중도 이탈) — 즉시 dnf 로 전환한다. 등수는 종료 시점에 완주자 뒤 누적 거리순으로 매겨진다.
   * 남은 참가자가 모두 완주 상태면 그대로 경주를 종료한다.
   */
  @Transactional()
  async quit({ roomId, userId }: { roomId: number; userId: number }): Promise<RaceSnapshot> {
    const room = await this.loadRoom(roomId);
    const now = today('YYYY-MM-DD HH:mm:ss');

    room.quit({ userId, quitOn: now });

    if (room.status === RoomStatus.LIVE && room.participants.every((p) => p.status !== ParticipantStatus.RUNNING)) {
      room.finalize(now);
    }

    await this.roomRepository.save([room]);

    return this.toSnapshot(room);
  }

  /**
   * 개인 기록 파생값 — 경과 시간(초)과 평균 페이스(초/km).
   * 저장하지 않고 Room.startOn 과 Participant.finishedOn/거리에서 매번 계산한다.
   */
  private toRecord(room: Room, participant: Participant) {
    const elapsedSeconds = participant.finishedOn ? diffSeconds(participant.finishedOn, room.startOn) : null;

    const paceSecondsPerKm =
      elapsedSeconds !== null && elapsedSeconds > 0 && participant.currentDistanceMeter > 0
        ? Math.round(elapsedSeconds / (participant.currentDistanceMeter / 1000))
        : null;

    return { elapsedSeconds, paceSecondsPerKm };
  }

  /**
   * 경주 결과 — 최종 순위와 참가자별 개인 기록(거리·시간·페이스).
   * 아직 끝나지 않은 방도 조회할 수 있고, 이때는 잠정 순위가 내려간다.
   */
  async getResult({ user, roomId }: { user: User; roomId: number }) {
    const room = await this.loadRoom(roomId);
    const userById = await this.loadParticipantUsers(room);

    return room.toInstance(GeneralRaceResultResponseDto, {
      endsOn: room.getEndsOn(),
      participants: room.getRankedParticipants().map((participant) => ({
        participantId: participant.id,
        userId: participant.userId,
        nickname: userById[participant.userId]?.nickname ?? '알 수 없음',
        profileImageUrl: userById[participant.userId]?.profileImageUrl ?? null,
        status: participant.status,
        finalRank: participant.finalRank,
        distanceMeter: participant.currentDistanceMeter,
        finishedOn: participant.finishedOn,
        voided: participant.voided,
        isMe: participant.userId === user.id,
        ...this.toRecord(room, participant),
      })),
    });
  }

  /**
   * 사용자별 경주 이력 — 내가 참가했던 방을 최근 시작순으로 돌려준다.
   * Participant(내 참가 기록) → Room 순으로 조회해 사용자 기준 필터를 인덱스(idx_participant_user_id)로 태운다.
   */
  async listHistory({ user, statuses }: { user: User; statuses?: RoomStatus[] }, options?: PaginationOptions) {
    const myParticipants = await this.roomRepository.findParticipants({ userId: user.id });

    if (myParticipants.length === 0) {
      return { items: [], total: 0 };
    }

    const participantByRoomId = keyBy(myParticipants, 'roomId');
    const conditions = {
      ids: Object.keys(participantByRoomId).map(Number),
      statuses: statuses ?? [RoomStatus.FINISHED, RoomStatus.CANCELLED],
    };

    const [rooms, total] = await Promise.all([
      this.roomRepository.find(conditions, {
        // 최근 경주가 위로. 호출부가 정렬을 넘기면 그쪽을 존중한다.
        options: { sort: 'startOn', order: OrderType.DESC, ...options },
        relations: { participants: true },
      }),
      this.roomRepository.count(conditions),
    ]);

    return {
      items: rooms.map((room) => {
        const mine = participantByRoomId[room.id];
        const { elapsedSeconds, paceSecondsPerKm } = this.toRecord(room, mine);

        return room.toInstance(GeneralRaceHistoryResponseDto, {
          participantCount: room.participants.length,
          myFinalRank: mine.finalRank,
          myStatus: mine.status,
          myVoided: mine.voided,
          myDistanceMeter: mine.currentDistanceMeter,
          myElapsedSeconds: elapsedSeconds,
          myPaceSecondsPerKm: paceSecondsPerKm,
        });
      }),
      total,
    };
  }
}
