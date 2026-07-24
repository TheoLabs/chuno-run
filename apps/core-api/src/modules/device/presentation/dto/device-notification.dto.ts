import { IsBoolean, IsOptional } from 'class-validator';

/** 알림 종류별 수신 설정. 넘긴 항목만 변경한다(부분 수정). */
export class GeneralDeviceNotificationDto {
  @IsBoolean()
  @IsOptional()
  raceStartingSoon?: boolean;

  @IsBoolean()
  @IsOptional()
  raceStarted?: boolean;

  @IsBoolean()
  @IsOptional()
  raceFinished?: boolean;
}
