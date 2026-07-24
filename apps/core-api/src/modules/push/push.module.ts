import { Module } from '@nestjs/common';
import { DeviceModule } from '@modules/device/device.module';
import { PushSender } from './domain/push-message';
import { FcmPushSender } from './applications/fcm-push-sender';
import { NotificationService } from './applications/notification.service';

/**
 * 푸시 발송 인프라. PushSender를 FcmPushSender로 바인딩하고 NotificationService를 노출한다.
 * 방 전이 잡·경주 게이트웨이가 NotificationService를 주입받아 알림을 보낸다.
 */
@Module({
  imports: [DeviceModule],
  providers: [{ provide: PushSender, useClass: FcmPushSender }, NotificationService],
  exports: [NotificationService],
})
export class PushModule {}
