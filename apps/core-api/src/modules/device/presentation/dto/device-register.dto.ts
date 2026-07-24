import { DevicePlatform, NotificationPermission } from '@modules/device/domain/device.entity';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** 기기 등록/갱신 요청. 같은 installationId면 기존 기기를 되살려 갱신한다. */
export class GeneralDeviceRegisterDto {
  @IsString()
  @IsNotEmpty()
  installationId: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  /** FCM 등록 토큰. 권한 미허용이면 생략 가능. */
  @IsString()
  @IsOptional()
  pushToken?: string;

  @IsEnum(NotificationPermission)
  @IsOptional()
  notificationPermission?: NotificationPermission;

  /** 사용자에게 보여줄 기기 이름(예: iPhone 15 Pro). */
  @IsString()
  @IsOptional()
  deviceName?: string;
}
