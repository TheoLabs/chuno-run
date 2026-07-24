import { ResponseDto } from '@libs/utils';
import { UserProvider, UserStatus } from '@modules/user/domain/user.entity';
import { CalendarDate } from '@types';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
abstract class BaseUserResponseDto extends ResponseDto {
  @Expose()
  id: number;

  @Expose()
  nickname: string | null;

  @Expose()
  profileImageUrl: string | null;

  @Expose()
  status: UserStatus;

  @Expose()
  provider: UserProvider;

  @Expose()
  joinOn: CalendarDate;
}

/** 관리자 사용자 목록 한 줄. */
@Exclude()
export class AdminUserListResponseDto extends BaseUserResponseDto {
  /** 참가한 경주 수(방 참가 기준). */
  @Expose()
  raceCount: number;
}

/** 관리자 사용자 상세 — 프로필·상태·가입 정보 + 참가 이력 요약. */
@Exclude()
export class AdminUserRetrieveResponseDto extends AdminUserListResponseDto {
  /** 제공자가 부여한 식별자. CS 문의 대조용으로 관리자에게만 노출한다. */
  @Expose()
  providerUserId: string;

  @Expose()
  finishedCount: number;

  @Expose()
  winCount: number;

  @Expose()
  totalRunningDistanceMeter: number;

  /** 완주율(%) — 완주 수 / 참가 수. */
  @Expose()
  completedRate: number;
}
