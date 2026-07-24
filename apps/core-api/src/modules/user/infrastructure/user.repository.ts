import { DddRepository } from '@libs/ddd';
import { Injectable } from '@nestjs/common';
import { User, UserProvider, UserStatus } from '../domain/user.entity';
import {
  applyLikeSearch,
  applyPagination,
  checkInValue,
  convertOptions,
  PaginationOptions,
  stripUndefined,
  TypeormRelationOptions,
} from '@libs/utils';

export interface UserFindConditions {
  ids?: number[];
  provider?: UserProvider;
  providerUserId?: string;
  statuses?: UserStatus[];
}

/** 관리자 사용자 목록 검색 키 → 실제 SQL 표현식. 여기 없는 키는 무시된다(주입 방어선). */
export const USER_SEARCH_COLUMNS: Record<string, string> = {
  nickname: 'user.nickname',
  id: 'CAST(user.id AS CHAR)',
  providerUserId: 'user.providerUserId',
};

@Injectable()
export class UserRepository extends DddRepository<User> {
  entityClass = User;

  private toWhere(conditions: UserFindConditions) {
    return stripUndefined<User>({
      id: checkInValue(conditions.ids),
      provider: conditions.provider,
      providerUserId: conditions.providerUserId,
      status: checkInValue(conditions.statuses),
    });
  }

  async find(conditions: UserFindConditions, options?: TypeormRelationOptions<User>) {
    return this.entityManager.find(this.entityClass, {
      where: this.toWhere(conditions),
      ...convertOptions(options),
    });
  }

  async count(conditions: UserFindConditions) {
    return this.entityManager.count(this.entityClass, {
      where: this.toWhere(conditions),
    });
  }

  /**
   * 관리자 사용자 목록 — 닉네임·id·제공자 식별자 키워드 검색을 곁들인 페이지네이션 조회.
   * 검색어가 없으면 find/count 와 동일하게 동작한다.
   */
  async search(
    conditions: UserFindConditions & { searchKeys?: string[]; searchValue?: string },
    options?: PaginationOptions
  ): Promise<[User[], number]> {
    const qb = this.createQueryBuilder('user');
    const where = this.toWhere(conditions);

    // 조건이 하나도 없으면 빈 객체가 깨진 WHERE 절이 되지 않게 건너뛴다.
    if (Object.keys(where).length > 0) {
      qb.where(where);
    }

    applyLikeSearch(qb, USER_SEARCH_COLUMNS, conditions.searchKeys, conditions.searchValue);
    applyPagination(qb, options);

    return qb.getManyAndCount();
  }
}
