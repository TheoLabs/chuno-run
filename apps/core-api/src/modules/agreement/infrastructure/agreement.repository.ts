import { DddRepository } from '@libs/ddd';
import { Injectable } from '@nestjs/common';
import { Agreement, AgreementStatus, AgreementType } from '../domain/agreement.entity';
import { CalendarDate } from '@types';
import { checkInValue, convertOptions, stripUndefined, TypeormRelationOptions } from '@libs/utils';

@Injectable()
export class AgreementRepository extends DddRepository<Agreement> {
  entityClass = Agreement;

  async find(
    conditions: {
      ids?: number[];
      types?: AgreementType[];
      version?: string;
      required?: boolean;
      statuses?: AgreementStatus[];
      expectedActivatedOn?: CalendarDate;
    },
    options?: TypeormRelationOptions<Agreement>
  ) {
    return this.entityManager.find(this.entityClass, {
      where: stripUndefined({
        id: checkInValue(conditions.ids),
        type: checkInValue(conditions.types),
        version: conditions.version,
        required: conditions.required,
        status: checkInValue(conditions.statuses),
        expectedActivatedOn: conditions.expectedActivatedOn,
      }),
      ...convertOptions(options),
    });
  }

  async count(conditions: {
    ids?: number[];
    types?: AgreementType[];
    version?: string;
    required?: boolean;
    statuses?: AgreementStatus[];
    expectedActivatedOn?: CalendarDate;
  }) {
    return this.entityManager.count(this.entityClass, {
      where: stripUndefined({
        id: checkInValue(conditions.ids),
        type: checkInValue(conditions.types),
        version: conditions.version,
        required: conditions.required,
        status: checkInValue(conditions.statuses),
        expectedActivatedOn: conditions.expectedActivatedOn,
      }),
    });
  }
}
