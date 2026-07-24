import { asyncLocalStorage, ContextKey } from '@libs/context';
import { TokenService } from '@libs/jwt';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import { GeneralRaceService, RaceSnapshot } from '../applications/general-race.service';
import { RoomStatus } from '../domain/room.entity';

/** 클라이언트 → 서버 이벤트 이름. */
export const RACE_CLIENT_EVENT = {
  /** 누적 거리 주기 송신. 재연결 후 재동기화도 같은 이벤트를 쓴다. */
  PROGRESS: 'race:progress',
  /** 목표 도달 알림. 등수는 이 이벤트의 서버 도착 순서로 확정된다. */
  REACH_GOAL: 'race:reach-goal',
  /** 경주 포기. */
  QUIT: 'race:quit',
  /** 최신 스냅샷 재요청. */
  SYNC: 'race:sync',
} as const;

/** 서버 → 클라이언트 이벤트 이름. */
export const RACE_SERVER_EVENT = {
  /** 방 전체 상태 + 리더보드 스냅샷. */
  STATE: 'race:state',
  /** 경주가 끝나 최종 순위가 확정됨. 페이로드는 STATE 와 동일한 스냅샷. */
  FINISHED: 'race:finished',
  /** 연결·요청 처리 실패. */
  ERROR: 'race:error',
} as const;

interface RaceSocketData {
  userId: number;
  roomId: number;
}

type RaceSocket = Socket & { data: RaceSocketData };

/**
 * 실시간 경주 채널. 접속은 `/races` 네임스페이스로, 방마다 socket.io room(`race:<roomId>`)에 묶인다.
 *
 * 서버는 거리를 재계산하지 않고 **릴레이**만 한다 — 참가자가 보낸 누적 거리를 반영해 순위를 매겨
 * 같은 방 전원에게 브로드캐스트하고, 목표 도달 이벤트는 도착 순서로 등수를 확정한다.
 * 출발·종료는 서버 시각(startOn/endsOn)을 함께 실어 보내 클라이언트가 시계 오차를 보정하게 한다.
 *
 * 핸드셰이크: `io('<base>/races', { auth: { token, roomId } })` (query 로 넘겨도 된다)
 */
@WebSocketGateway({
  namespace: '/races',
  cors: { origin: '*' },
})
export class RaceGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(RaceGateway.name);

  @WebSocketServer()
  private server: Server;

  /** 접속자가 있는 방만 틱을 돌린다. roomId → 접속 소켓 수. */
  private readonly activeRoomIds = new Map<number, number>();

  /** 방별 마지막으로 브로드캐스트한 상태. 스케줄러가 먼저 전이시킨 경우를 감지해 재브로드캐스트한다. */
  private readonly lastBroadcastStatus = new Map<number, string>();

  private timer?: NodeJS.Timeout;

  /** 상태 전이(출발/종료)를 확인하는 주기. 카운트다운 체감을 해치지 않을 만큼 짧게. */
  private static readonly TICK_MS = 2_000;

  constructor(
    private readonly generalRaceService: GeneralRaceService,
    private readonly tokenService: TokenService
  ) {}

  afterInit() {
    this.timer = setInterval(() => void this.tick(), RaceGateway.TICK_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async handleConnection(socket: RaceSocket) {
    try {
      const { userId, roomId } = this.authenticate(socket);

      await this.withContext(() => this.generalRaceService.assertParticipant({ roomId, userId }));

      socket.data = { userId, roomId };
      await socket.join(this.channel(roomId));
      this.activeRoomIds.set(roomId, (this.activeRoomIds.get(roomId) ?? 0) + 1);

      // 접속 즉시 최신 상태를 보낸다 — 최초 진입과 재접속(스냅샷 복구)이 같은 경로다.
      const snapshot = await this.withContext(() => this.generalRaceService.getSnapshot(roomId));
      socket.emit(RACE_SERVER_EVENT.STATE, snapshot);
      this.lastBroadcastStatus.set(roomId, snapshot.status);
    } catch (error) {
      socket.emit(RACE_SERVER_EVENT.ERROR, { message: this.toMessage(error) });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: RaceSocket) {
    const roomId = socket.data?.roomId;

    if (roomId === undefined) {
      return;
    }

    const remaining = (this.activeRoomIds.get(roomId) ?? 1) - 1;

    if (remaining <= 0) {
      this.activeRoomIds.delete(roomId);
      this.lastBroadcastStatus.delete(roomId);
    } else {
      this.activeRoomIds.set(roomId, remaining);
    }
  }

  /** 진행값 수신 → 정합성 검사 후 방 전체에 리더보드 브로드캐스트. */
  @SubscribeMessage(RACE_CLIENT_EVENT.PROGRESS)
  async onProgress(
    @ConnectedSocket() socket: RaceSocket,
    @MessageBody() body: { distanceMeter?: number; elapsedSeconds?: number }
  ) {
    await this.handle(socket, (data) =>
      this.generalRaceService.progress({
        ...data,
        distanceMeter: this.toDistanceMeter(body?.distanceMeter),
        clientElapsedSeconds: this.toElapsedSeconds(body?.elapsedSeconds),
      })
    );
  }

  /** 목표 도달 수신 → 등수 확정 후 브로드캐스트. */
  @SubscribeMessage(RACE_CLIENT_EVENT.REACH_GOAL)
  async onReachGoal(@ConnectedSocket() socket: RaceSocket, @MessageBody() body: { distanceMeter?: number }) {
    await this.handle(socket, (data) =>
      this.generalRaceService.reachGoal({
        ...data,
        distanceMeter: this.toDistanceMeter(body?.distanceMeter),
      })
    );
  }

  /** 경주 포기 수신 → dnf 처리 후 브로드캐스트. */
  @SubscribeMessage(RACE_CLIENT_EVENT.QUIT)
  async onQuit(@ConnectedSocket() socket: RaceSocket) {
    await this.handle(socket, (data) => this.generalRaceService.quit(data));
  }

  /** 스냅샷 재요청 — 재연결 직후 클라이언트가 상태를 다시 맞출 때. */
  @SubscribeMessage(RACE_CLIENT_EVENT.SYNC)
  async onSync(@ConnectedSocket() socket: RaceSocket) {
    const roomId = socket.data?.roomId;

    if (roomId === undefined) {
      return;
    }

    try {
      const snapshot = await this.withContext(() => this.generalRaceService.getSnapshot(roomId));
      socket.emit(RACE_SERVER_EVENT.STATE, snapshot);
    } catch (error) {
      socket.emit(RACE_SERVER_EVENT.ERROR, { message: this.toMessage(error) });
    }
  }

  /**
   * 접속 중인 방들의 시각 기반 전이(출발·제한 시간 만료 종료)를 확인하고,
   * 상태가 바뀐 방에만 브로드캐스트한다.
   */
  private async tick() {
    for (const roomId of [...this.activeRoomIds.keys()]) {
      try {
        const { snapshot, changed } = await this.withContext(() => this.generalRaceService.syncRoom(roomId));

        // 내가 전이시켰거나(changed), 스케줄러 잡이 먼저 전이시켜 마지막 브로드캐스트와 상태가 달라졌으면
        // 방 전체에 알린다. (스케줄러는 DB만 바꾸므로 이 비교가 없으면 그 전이가 소켓으로 안 나간다.)
        if (changed || this.lastBroadcastStatus.get(roomId) !== snapshot.status) {
          this.broadcast(snapshot);
        }
      } catch (error) {
        this.logger.warn(`경주 상태 동기화 실패 (roomId=${roomId}): ${this.toMessage(error)}`);
      }
    }
  }

  /** 이벤트 처리 공통 골격 — 인증된 소켓인지 확인하고, 결과 스냅샷을 방 전체에 뿌린다. */
  private async handle(socket: RaceSocket, run: (data: RaceSocketData) => Promise<RaceSnapshot>) {
    const data = socket.data;

    if (!data || data.roomId === undefined) {
      socket.emit(RACE_SERVER_EVENT.ERROR, { message: '인증되지 않은 연결입니다.' });
      return;
    }

    try {
      const snapshot = await this.withContext(() => run(data));
      this.broadcast(snapshot);
    } catch (error) {
      socket.emit(RACE_SERVER_EVENT.ERROR, { message: this.toMessage(error) });
    }
  }

  private broadcast(snapshot: RaceSnapshot) {
    const event = snapshot.status === RoomStatus.FINISHED ? RACE_SERVER_EVENT.FINISHED : RACE_SERVER_EVENT.STATE;
    this.server.to(this.channel(snapshot.roomId)).emit(event, snapshot);
    this.lastBroadcastStatus.set(snapshot.roomId, snapshot.status);
  }

  private channel(roomId: number) {
    return `race:${roomId}`;
  }

  /**
   * 핸드셰이크에서 토큰·roomId 를 꺼내 검증한다.
   * HTTP 요청이 아니라 UserGuard 를 못 쓰므로 게이트웨이가 직접 토큰을 확인한다.
   */
  private authenticate(socket: RaceSocket): RaceSocketData {
    const { auth, query } = socket.handshake;
    const token = this.firstValue(auth?.token ?? query?.token);
    const roomId = Number(this.firstValue(auth?.roomId ?? query?.roomId));

    if (!token) {
      throw new Error('인증 토큰이 필요합니다.');
    }

    if (!Number.isInteger(roomId) || roomId <= 0) {
      throw new Error('roomId 가 필요합니다.');
    }

    const { userId } = this.tokenService.verifyAccessToken(token);

    return { userId, roomId };
  }

  private firstValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' ? value[0] : undefined;
    }

    return typeof value === 'string' ? value : undefined;
  }

  /** 진행값 정규화 — 음수·NaN 은 0으로 눕힌다. 거리는 정수 meter 규약. */
  private toDistanceMeter(value: unknown): number {
    const distanceMeter = Number(value);

    return Number.isFinite(distanceMeter) && distanceMeter > 0 ? Math.trunc(distanceMeter) : 0;
  }

  /** 클라이언트가 주장하는 출발 이후 경과 시간(초). 없거나 이상하면 undefined(타임스탬프 검사 생략). */
  private toElapsedSeconds(value: unknown): number | undefined {
    const seconds = Number(value);

    return Number.isFinite(seconds) && seconds >= 0 ? Math.trunc(seconds) : undefined;
  }

  /**
   * @Transactional 이 참조하는 ALS 컨텍스트를 열고 실행한다.
   * 소켓 이벤트는 HTTP 미들웨어를 타지 않아 컨텍스트가 비어 있으므로 여기서 직접 만든다.
   */
  private withContext<T>(run: () => Promise<T>): Promise<T> {
    return asyncLocalStorage.run(new Map<string, unknown>(), () => {
      asyncLocalStorage.getStore()?.set(ContextKey.TXID, randomUUID());
      return run();
    });
  }

  private toMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
