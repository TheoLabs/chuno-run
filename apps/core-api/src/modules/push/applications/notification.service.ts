import { DddService } from '@libs/ddd';
import { Device, DeviceStatus, NotificationKind } from '@modules/device/domain/device.entity';
import { DeviceRepository } from '@modules/device/infrastructure/device.repository';
import { Injectable, Logger } from '@nestjs/common';
import { PushMessage, PushSender } from '../domain/push-message';

/** 경주 관련 알림 3종. NotificationKind와 1:1 대응하며 문구·payload를 정의한다. */
export type RaceNotificationType = 'startingSoon' | 'started' | 'finished';

const NOTIFICATION_KIND: Record<RaceNotificationType, NotificationKind> = {
  startingSoon: NotificationKind.RACE_STARTING_SOON,
  started: NotificationKind.RACE_STARTED,
  finished: NotificationKind.RACE_FINISHED,
};

/**
 * 알림 발송 유스케이스 — "누구에게, 어떤 종류를" 정하면 활성 기기를 찾아 PushSender로 보낸다.
 *
 * 발송 대상은 Device.canReceive(권한 granted·토큰 존재·해당 종류 on)로 서버가 고정한다.
 * 무효 토큰으로 실패한 기기는 곧바로 revoke해 다음부터 발송 대상에서 뺀다(자동 정리).
 */
@Injectable()
export class NotificationService extends DddService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly deviceRepository: DeviceRepository,
    private readonly pushSender: PushSender
  ) {
    super();
  }

  /**
   * 경주 알림을 여러 사용자에게 보낸다. roomId·title로 문구를 만들고 payload에 실어
   * 앱이 탭 시 해당 방으로 갈 수 있게 한다. 알림이 부가 기능이라 실패해도 예외를 던지지 않는다.
   *
   * 트랜잭션 밖에서 호출한다(방 전이 커밋 이후) — 중첩 @Transactional의 엔티티매니저 리셋을 피하기 위해서다.
   */
  async notifyRaceEvent({
    type,
    userIds,
    roomId,
    roomTitle,
  }: {
    type: RaceNotificationType;
    userIds: number[];
    roomId: number;
    roomTitle: string;
  }): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const kind = NOTIFICATION_KIND[type];

    const devices = await this.deviceRepository.find({
      userIds: [...new Set(userIds)],
      statuses: [DeviceStatus.ACTIVE],
    });

    const targets = devices.filter((device) => device.canReceive(kind));

    if (targets.length === 0) {
      return;
    }

    const { title, body } = this.compose(type, roomTitle);
    const data = { type: `race:${type}`, roomId: String(roomId) };

    const messages: PushMessage[] = targets.map((device) => ({ token: device.pushToken!, title, body, data }));

    try {
      const result = await this.pushSender.sendEach(messages);

      if (result.invalidTokens.length > 0) {
        await this.revokeByTokens(devices, result.invalidTokens);
      }

      this.logger.log(
        `경주 알림(${type}) roomId=${roomId} → 성공 ${result.successCount} · 실패 ${result.failureCount}`
      );
    } catch (error) {
      // 발송 실패가 경주 진행을 막으면 안 된다 — 로그만 남긴다.
      this.logger.warn(`경주 알림(${type}) 발송 실패 roomId=${roomId}: ${this.toMessage(error)}`);
    }
  }

  /** 무효 토큰으로 실패한 기기를 해지한다(자동 정리). */
  private async revokeByTokens(devices: Device[], invalidTokens: string[]) {
    const tokenSet = new Set(invalidTokens);
    const revoked = devices.filter((device) => device.pushToken && tokenSet.has(device.pushToken));

    revoked.forEach((device) => device.revoke());

    if (revoked.length > 0) {
      await this.deviceRepository.save(revoked);
      this.logger.log(`무효 토큰 기기 ${revoked.length}대 자동 해지.`);
    }
  }

  private compose(type: RaceNotificationType, roomTitle: string): { title: string; body: string } {
    switch (type) {
      case 'startingSoon':
        return { title: '곧 경주가 시작돼요', body: `‘${roomTitle}’ 모집이 마감됐어요. 시작 준비를 해주세요!` };
      case 'started':
        return { title: '출발!', body: `‘${roomTitle}’ 경주가 시작됐어요. 지금 달려요!` };
      case 'finished':
        return { title: '경주 종료', body: `‘${roomTitle}’ 결과가 확정됐어요. 순위를 확인해보세요.` };
      default:
        return { title: '추노', body: roomTitle };
    }
  }

  private toMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
