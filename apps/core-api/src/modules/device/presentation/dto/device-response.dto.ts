import { ResponseDto } from '@libs/utils';
import { DevicePlatform, DeviceStatus, NotificationPermission } from '@modules/device/domain/device.entity';
import { CalendarDate } from '@types';
import { Exclude, Expose } from 'class-transformer';

/** 기기 관리 화면용 기기 한 줄. pushToken 같은 내부값은 노출하지 않는다. */
@Exclude()
export class GeneralDeviceResponseDto extends ResponseDto {
  @Expose()
  id: number;

  @Expose()
  platform: DevicePlatform;

  @Expose()
  deviceName: string | null;

  @Expose()
  notificationPermission: NotificationPermission;

  @Expose()
  raceStartingSoonEnabled: boolean;

  @Expose()
  raceStartedEnabled: boolean;

  @Expose()
  raceFinishedEnabled: boolean;

  @Expose()
  status: DeviceStatus;

  @Expose()
  lastActiveOn: CalendarDate | null;

  /** 지금 이 요청을 보낸 기기인지. 목록에서 '이 기기' 배지·해지 차단에 쓴다. */
  @Expose()
  isCurrent: boolean;
}
