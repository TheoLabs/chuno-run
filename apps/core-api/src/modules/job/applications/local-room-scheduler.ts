import { ConfigsService } from '@configs';
import { asyncLocalStorage, ContextKey } from '@libs/context';
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AdminRoomJobService } from './room-job.service';

/**
 * [로컬 개발 전용] 방 자동 전이 잡을 주기적으로 돌리는 인프로세스 티커.
 *
 * 운영에서는 외부 스케줄러(EventBridge 등)가 `POST /admins/jobs/rooms/transition` 을 호출한다
 * (→ {@link AdminRoomJobService}). 로컬에는 그 스케줄러가 없어 대기실이 영원히 recruiting 에
 * 머무르므로, local 환경에서만 같은 서비스를 짧은 주기로 직접 호출한다.
 * 다중 인스턴스에서 중복 실행되면 안 되므로 production 에서는 절대 뜨지 않는다.
 */
@Injectable()
export class LocalRoomScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(LocalRoomScheduler.name);
  private timer?: NodeJS.Timeout;

  /** 전이 확인 주기. 카운트다운 체감을 해치지 않을 만큼 짧게 잡는다. */
  private static readonly INTERVAL_MS = 10_000;

  constructor(
    private readonly adminRoomJobService: AdminRoomJobService,
    private readonly configsService: ConfigsService
  ) {}

  onApplicationBootstrap() {
    if (!this.configsService.isLocal()) {
      return;
    }

    this.timer = setInterval(() => void this.tick(), LocalRoomScheduler.INTERVAL_MS);
    this.logger.log(`로컬 방 자동 전이 티커 시작 (${LocalRoomScheduler.INTERVAL_MS / 1000}s 주기)`);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * @Transactional 이 참조하는 ALS 컨텍스트(txId)를 새로 열고 전이를 실행한다.
   * HTTP 요청 밖이라 미들웨어가 채워주는 컨텍스트가 없으므로 여기서 직접 만든다.
   */
  private async tick() {
    await asyncLocalStorage.run(new Map<string, unknown>(), async () => {
      asyncLocalStorage.getStore()?.set(ContextKey.TXID, randomUUID());

      try {
        const result = await this.adminRoomJobService.transitionRoomsAndNotify();
        const changedCount =
          result.closedRoomIds.length +
          result.cancelledRoomIds.length +
          result.startedRoomIds.length +
          result.finishedRoomIds.length;

        if (changedCount > 0) {
          this.logger.log(`방 자동 전이: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        this.logger.warn(`방 자동 전이 실패: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }
}
