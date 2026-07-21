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

export { dayjs };
export default dayjs;
