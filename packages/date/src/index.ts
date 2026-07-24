import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

/**
 * CalendarDate
 *
 * 런타임에는 그냥 `string`(`YYYY-MM-DD` 또는 `YYYY-MM-DD HH:mm:ss`)이라
 * JSON 직렬화·TypeORM 컬럼(date/datetime)과 그대로 호환되고,
 * 컴파일 타임에는 일반 string과 구분되는 브랜드 타입이다.
 */
declare const brand: unique symbol;

/** `YYYY-MM-DD` 또는 `YYYY-MM-DD HH:mm:ss` 형식의 문자열 */
export type CalendarDate = string & { readonly [brand]: 'CalendarDate' };

dayjs.extend(utc);
dayjs.extend(timezone);

// 기본 타임존 = KST(Asia/Seoul). dayjs.tz(...) 호출 시 이 존을 기준으로 동작.
dayjs.tz.setDefault('Asia/Seoul');

export function today(format: 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm:ss' = 'YYYY-MM-DD'): CalendarDate {
  return dayjs.tz().format(format) as CalendarDate;
}

/**
 * 비즈니스 날짜(KST `CalendarDate`)를 절대시각 epoch millis로 변환한다.
 * 기본 존이 Asia/Seoul이라 `dayjs.tz(date)`가 문자열을 KST로 해석한다. 예약 지연잡 delay 계산 등에 사용.
 */
export function toEpochMs(date: CalendarDate): number {
  return dayjs.tz(date).valueOf();
}

/** 절대시각 epoch millis를 KST 기준 `CalendarDate`로 되돌린다. ({@link toEpochMs}의 역함수) */
export function fromEpochMs(
  ms: number,
  format: 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm:ss' = 'YYYY-MM-DD HH:mm:ss'
): CalendarDate {
  return dayjs(ms).tz().format(format) as CalendarDate;
}

/**
 * KST 기준으로 분 단위만큼 이동한 시각을 돌려준다. 음수를 넘기면 과거로 간다.
 * (모집 마감 = 시작 -10분, 종료 = 시작 +제한시간 처럼 분 단위 파생 시각 계산에 쓴다.)
 */
export function addMinutes(
  date: CalendarDate,
  minutes: number,
  format: 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm:ss' = 'YYYY-MM-DD HH:mm:ss'
): CalendarDate {
  return dayjs.tz(date).add(minutes, 'minute').format(format) as CalendarDate;
}

/** 두 시각의 차이를 초로 돌려준다 (a - b). 경과 시간·페이스 계산용. */
export function diffSeconds(a: CalendarDate, b: CalendarDate): number {
  return Math.round((toEpochMs(a) - toEpochMs(b)) / 1000);
}

/** KST 기준으로 일(day) 단위 이동한 시각. 유예 기간·만료일 계산용. */
export function addDays(
  date: CalendarDate,
  days: number,
  format: 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm:ss' = 'YYYY-MM-DD HH:mm:ss'
): CalendarDate {
  return dayjs.tz(date).add(days, 'day').format(format) as CalendarDate;
}

export { dayjs };
export default dayjs;
