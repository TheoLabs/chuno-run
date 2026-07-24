import { Transform } from 'class-transformer';

type ToArrayType = 'string' | 'number' | 'boolean';

function cast(value: unknown, type: ToArrayType): unknown {
  switch (type) {
    case 'number':
      // 변환 실패(NaN)는 그대로 두어 @IsInt/@IsNumber 가 거르게 한다.
      return Number(value);
    case 'boolean':
      return value === true || value === 'true';
    default:
      return value;
  }
}

/**
 * 쿼리스트링 값을 배열로 정규화하고, 각 요소를 지정 타입으로 캐스팅하는 데코레이터.
 *
 * 배열 파라미터의 표준 표기는 **콤마 구분**(CONVENTIONS.md §6)이며, 반복 파라미터
 * (`?statuses=a&statuses=b`)도 함께 받아준다. 콤마 주변 공백과 빈 항목은 버린다.
 *
 * @param type 요소 타입. 기본 `'string'`(캐스팅 없음).
 *
 * @example
 * // ?statuses=active                  → ['active']
 * // ?statuses=active,expired          → ['active', 'expired']
 * // ?statuses=active&statuses=expired → ['active', 'expired']
 * @ToArray()                 // string[]
 * @IsEnum(LicenseStatus, { each: true })
 * @IsOptional()
 * statuses?: LicenseStatus[];
 *
 * @example
 * // ?tagIds=1            → [1]
 * // ?tagIds=1&tagIds=2   → [1, 2]
 * @ToArray('number')         // number[]
 * @IsInt({ each: true })
 * @IsOptional()
 * tagIds?: number[];
 */
export function ToArray(type: ToArrayType = 'string'): PropertyDecorator {
  return Transform(({ value }) => {
    // undefined/null 은 그대로 두어 @IsOptional 이 동작하게 한다.
    if (value === undefined || value === null) {
      return value;
    }

    // 반복 파라미터는 이미 배열, 단일 값은 콤마로 나눈다. 문자열이 아닌 값은 그대로 둔다
    // (형식 검증은 @IsEnum/@IsInt 같은 뒤따르는 데코레이터가 한다).
    const array = (Array.isArray(value) ? value : [value]).flatMap((item) =>
      typeof item === 'string' ? item.split(',') : [item]
    );

    const cleaned = array.map((item) => (typeof item === 'string' ? item.trim() : item)).filter((item) => item !== '');

    return type === 'string' ? cleaned : cleaned.map((item) => cast(item, type));
  });
}
