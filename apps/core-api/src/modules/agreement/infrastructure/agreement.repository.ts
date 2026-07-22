import { DddRepository } from '@libs/ddd';
import { Injectable } from '@nestjs/common';
import { Agreement, AgreementStatus, AgreementType } from '../domain/agreement.entity';
import { CalendarDate } from '@types';
import { checkInValue, checkRangeValue, convertOptions, stripUndefined, TypeormRelationOptions } from '@libs/utils';
import { LessThanOrEqual } from 'typeorm';

@Injectable()
export class AgreementRepository extends DddRepository<Agreement> {
  entityClass = Agreement;

  async find(
    conditions: {
      ids?: number[];
      types?: AgreementType[];
      version?: string;
      required?: boolean[];
      statuses?: AgreementStatus[];
      expectedActivatedOn?: CalendarDate;
      // 시행일 도달분 전부(<= 기준일) — 스케줄러 catch-up용 inclusive 상한.
      expectedActivatedOnUntil?: CalendarDate;
      minExpectedActivatedOn?: CalendarDate;
      maxExpectedActivatedOn?: CalendarDate;
    },
    options?: TypeormRelationOptions<Agreement>
  ) {
    return this.entityManager.find(this.entityClass, {
      where: stripUndefined({
        id: checkInValue(conditions.ids),
        type: checkInValue(conditions.types),
        version: conditions.version,
        required: checkInValue(conditions.required),
        status: checkInValue(conditions.statuses),
        expectedActivatedOn:
          conditions.expectedActivatedOn ??
          (conditions.expectedActivatedOnUntil !== undefined
            ? LessThanOrEqual(conditions.expectedActivatedOnUntil)
            : checkRangeValue(conditions.minExpectedActivatedOn, conditions.maxExpectedActivatedOn)),
      }),
      ...convertOptions(options),
    });
  }

  async count(conditions: {
    ids?: number[];
    types?: AgreementType[];
    version?: string;
    required?: boolean[];
    statuses?: AgreementStatus[];
    expectedActivatedOn?: CalendarDate;
    minExpectedActivatedOn?: CalendarDate;
    maxExpectedActivatedOn?: CalendarDate;
  }) {
    return this.entityManager.count(this.entityClass, {
      where: stripUndefined({
        id: checkInValue(conditions.ids),
        type: checkInValue(conditions.types),
        version: conditions.version,
        required: checkInValue(conditions.required),
        status: checkInValue(conditions.statuses),
        expectedActivatedOn:
          conditions.expectedActivatedOn ??
          checkRangeValue(conditions.minExpectedActivatedOn, conditions.maxExpectedActivatedOn),
      }),
    });
  }
}
