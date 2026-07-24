import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { User } from '@modules/user/domain/user.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Device,
  DevicePlatform,
  DeviceStatus,
  NotificationKind,
  NotificationPermission,
} from '../domain/device.entity';
import { DeviceRepository } from '../infrastructure/device.repository';
import { GeneralDeviceResponseDto } from '../presentation/dto';

/**
 * 앱 사용자 기기 유스케이스 — 멀티기기 세션과 푸시 토큰을 관리한다.
 *
 * 같은 사용자·설치(installationId) 조합은 유일하므로, 로그인·토큰 갱신 때 등록하면 upsert된다.
 * 로그아웃·해지 시 revoked로 전이해 발송 대상에서 뺀다.
 */
@Injectable()
export class GeneralDeviceService extends DddService {
  constructor(private readonly deviceRepository: DeviceRepository) {
    super();
  }

  /**
   * 기기 등록/갱신 — 같은 기기(installationId)가 있으면 되살려 갱신하고, 없으면 새로 만든다.
   * 로그인 직후와 토큰 갱신·권한 변경 시 앱이 호출한다.
   */
  @Transactional()
  async register({
    user,
    installationId,
    platform,
    pushToken,
    notificationPermission,
    deviceName,
  }: {
    user: User;
    installationId: string;
    platform: DevicePlatform;
    pushToken?: string | null;
    notificationPermission?: NotificationPermission;
    deviceName?: string | null;
  }) {
    const [existing] = await this.deviceRepository.find({ userId: user.id, installationId });

    const device =
      existing ??
      Device.create({ userId: user.id, installationId, platform, pushToken, notificationPermission, deviceName });

    if (existing) {
      existing.refresh({ platform, pushToken, notificationPermission, deviceName });
    }

    await this.deviceRepository.save([device]);

    return { id: device.id };
  }

  /** 내 기기 목록 — 활성 기기를 최근 사용순으로. 현재 기기(installationId 일치) 표시. */
  async list({ user, currentInstallationId }: { user: User; currentInstallationId?: string }) {
    const devices = await this.deviceRepository.find(
      { userId: user.id, statuses: [DeviceStatus.ACTIVE] },
      { options: { sort: 'lastActiveOn', order: 'DESC' as never } }
    );

    return {
      items: devices.map((device) =>
        device.toInstance(GeneralDeviceResponseDto, {
          isCurrent: !!currentInstallationId && device.installationId === currentInstallationId,
        })
      ),
      total: devices.length,
    };
  }

  /** 알림 종류별 수신 설정 변경. */
  @Transactional()
  async changeNotificationSettings({
    user,
    id,
    settings,
  }: {
    user: User;
    id: number;
    settings: Partial<Record<NotificationKind, boolean>>;
  }) {
    const device = await this.getOwned(user, id);

    device.changeNotificationSettings(settings);

    await this.deviceRepository.save([device]);
  }

  /** 기기 해지 — 대상 기기를 revoked로 전이한다(로그아웃·다른 기기 정리). */
  @Transactional()
  async revoke({ user, id }: { user: User; id: number }) {
    const device = await this.getOwned(user, id);

    device.revoke();

    await this.deviceRepository.save([device]);

    return { id: device.id };
  }

  /**
   * 현재 기기(installationId) 해지 — 로그아웃 흐름에서 호출한다.
   * 등록된 기기가 없으면 조용히 지나간다(로그인 전 로그아웃 등).
   */
  @Transactional()
  async revokeByInstallation({ user, installationId }: { user: User; installationId: string }) {
    const [device] = await this.deviceRepository.find({ userId: user.id, installationId });

    if (!device) {
      return;
    }

    device.revoke();

    await this.deviceRepository.save([device]);
  }

  private async getOwned(user: User, id: number): Promise<Device> {
    const [device] = await this.deviceRepository.find({ id, userId: user.id });

    if (!device) {
      throw new NotFoundException('존재하지 않는 기기입니다.');
    }

    return device;
  }
}
