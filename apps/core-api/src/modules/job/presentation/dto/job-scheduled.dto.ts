import { CalendarDate } from '@types';
import { IsOptional, IsString } from 'class-validator';

export class JobScheduledDto {
  @IsString()
  scheduledOn: CalendarDate;
}

/**
 * 방 자동 전이 잡 요청. 기준 시각을 넘기지 않으면 서버의 현재 시각을 쓴다.
 * (약관 활성화 잡과 달리 분·초 단위로 판정하므로 `YYYY-MM-DD HH:mm:ss` 를 받는다.)
 */
export class RoomTransitionJobDto {
  @IsString()
  @IsOptional()
  scheduledOn?: CalendarDate;
}
