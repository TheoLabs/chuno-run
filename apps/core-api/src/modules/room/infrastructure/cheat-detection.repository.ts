import { DddRepository } from '@libs/ddd';
import {
  applyLikeSearch,
  applyPagination,
  checkInValue,
  convertOptions,
  PaginationOptions,
  stripUndefined,
  TypeormRelationOptions,
} from '@libs/utils';
import { Injectable } from '@nestjs/common';
import { CheatDetection, CheatType } from '../domain/cheat-detection.entity';

export interface CheatDetectionFindConditions {
  id?: number;
  participantId?: number;
  participantIds?: number[];
  types?: CheatType[];
}

/** 관리자 탐지 이력 검색 키 → SQL 표현식. 여기 없는 키는 무시된다. */
export const CHEAT_DETECTION_SEARCH_COLUMNS: Record<string, string> = {
  id: 'CAST(detection.id AS CHAR)',
  detail: 'detection.detail',
};

@Injectable()
export class CheatDetectionRepository extends DddRepository<CheatDetection> {
  entityClass = CheatDetection;

  private toWhere(conditions: CheatDetectionFindConditions) {
    return stripUndefined<CheatDetection>({
      id: conditions.id,
      participantId: conditions.participantIds ? checkInValue(conditions.participantIds) : conditions.participantId,
      type: checkInValue(conditions.types),
    });
  }

  async find(conditions: CheatDetectionFindConditions, options?: TypeormRelationOptions<CheatDetection>) {
    return this.entityManager.find(this.entityClass, {
      where: this.toWhere(conditions),
      ...convertOptions(options),
    });
  }

  async count(conditions: CheatDetectionFindConditions) {
    return this.entityManager.count(this.entityClass, {
      where: this.toWhere(conditions),
    });
  }

  /**
   * 관리자 탐지 이력 목록 — 유형 필터 + 참가자 제한 + 키워드 검색 + 페이지네이션.
   * 최근 탐지순으로 내려준다.
   */
  async search(
    conditions: CheatDetectionFindConditions & { searchKeys?: string[]; searchValue?: string },
    options?: PaginationOptions
  ): Promise<[CheatDetection[], number]> {
    const qb = this.createQueryBuilder('detection');
    const where = this.toWhere(conditions);

    if (Object.keys(where).length > 0) {
      qb.where(where);
    }

    applyLikeSearch(qb, CHEAT_DETECTION_SEARCH_COLUMNS, conditions.searchKeys, conditions.searchValue);
    applyPagination(qb, options ?? { sort: 'detectedOn', order: 'DESC' as never });

    return qb.getManyAndCount();
  }
}
