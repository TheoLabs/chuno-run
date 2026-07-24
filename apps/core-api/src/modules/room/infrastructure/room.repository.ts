import { DddRepository } from '@libs/ddd';
import { Injectable } from '@nestjs/common';
import { Room, RoomStatus } from '../domain/room.entity';
import {
  applyLikeSearch,
  applyPagination,
  checkInValue,
  checkRangeValue,
  convertOptions,
  PaginationOptions,
  stripUndefined,
  TypeormRelationOptions,
} from '@libs/utils';
import { Participant, ParticipantStatus } from '../domain/participant.entity';
import { CalendarDate } from '@types';

export interface RoomFindConditions {
  id?: number;
  ids?: number[];
  hostUserId?: number;
  statuses?: RoomStatus[];
  minGoalDistanceMeter?: number;
  maxGoalDistanceMeter?: number;
  minGoalLimitMinutes?: number;
  maxGoalLimitMinutes?: number;
  /** 시작 예정 시각 하한 (>=). 자동 전이 잡의 대상 선별에 쓴다. */
  minStartOn?: CalendarDate;
  /** 시작 예정 시각 상한 (<). 자동 전이 잡의 대상 선별에 쓴다. */
  maxStartOn?: CalendarDate;
}

export interface ParticipantFindConditions {
  id?: number;
  ids?: number[];
  roomIds?: number[];
  userId?: number;
  userIds?: number[];
  statuses?: ParticipantStatus[];
}

/** 관리자 방 목록 검색 키 → 실제 SQL 표현식. 여기 없는 키는 무시된다(주입 방어선). */
export const ROOM_SEARCH_COLUMNS: Record<string, string> = {
  title: 'room.title',
  id: 'CAST(room.id AS CHAR)',
};

@Injectable()
export class RoomRepository extends DddRepository<Room> {
  entityClass = Room;

  private toWhere(conditions: RoomFindConditions) {
    return stripUndefined<Room>({
      id: conditions.ids ? checkInValue(conditions.ids) : conditions.id,
      hostUserId: conditions.hostUserId,
      status: checkInValue(conditions.statuses),
      goalDistanceMeter: checkRangeValue(conditions.minGoalDistanceMeter, conditions.maxGoalDistanceMeter),
      goalLimitMinutes: checkRangeValue(conditions.minGoalLimitMinutes, conditions.maxGoalLimitMinutes),
      startOn: checkRangeValue(conditions.minStartOn, conditions.maxStartOn),
    });
  }

  async find(conditions: RoomFindConditions, options?: TypeormRelationOptions<Room>) {
    return this.entityManager.find(this.entityClass, {
      where: this.toWhere(conditions),
      ...convertOptions(options),
    });
  }

  async count(conditions: RoomFindConditions) {
    return this.entityManager.count(this.entityClass, {
      where: this.toWhere(conditions),
    });
  }

  /**
   * 관리자 방 목록 — 제목·id 키워드 검색을 곁들인 페이지네이션 조회.
   * 검색이 없으면 find/count 와 동일하게 동작한다.
   */
  async search(
    conditions: RoomFindConditions & { searchKeys?: string[]; searchValue?: string },
    options?: PaginationOptions
  ): Promise<[Room[], number]> {
    const qb = this.createQueryBuilder('room');
    const where = this.toWhere(conditions);

    // 조건이 하나도 없으면 빈 객체를 넘겨 깨진 WHERE 절이 나오지 않게 건너뛴다.
    if (Object.keys(where).length > 0) {
      qb.where(where);
    }

    applyLikeSearch(qb, ROOM_SEARCH_COLUMNS, conditions.searchKeys, conditions.searchValue);
    applyPagination(qb, options);

    return qb.getManyAndCount();
  }

  private toParticipantWhere(conditions: ParticipantFindConditions) {
    return stripUndefined<Participant>({
      id: conditions.ids ? checkInValue(conditions.ids) : conditions.id,
      roomId: checkInValue(conditions.roomIds),
      userId: conditions.userIds ? checkInValue(conditions.userIds) : conditions.userId,
      status: checkInValue(conditions.statuses),
    });
  }

  async findParticipants(conditions: ParticipantFindConditions, options?: TypeormRelationOptions<Participant>) {
    return this.entityManager.find(Participant, {
      where: this.toParticipantWhere(conditions),
      ...convertOptions(options),
    });
  }

  async countParticipants(conditions: ParticipantFindConditions) {
    return this.entityManager.count(Participant, {
      where: this.toParticipantWhere(conditions),
    });
  }

  /**
   * 참가자 row 를 직접 저장한다 — 보통은 Room.save 의 cascade 로 저장되지만,
   * 방을 통째로 로드하기 부담스러운 경우(예: 탈퇴 시 여러 방의 내 참가만 정리) 쓴다.
   */
  async saveParticipants(participants: Participant[]) {
    await this.entityManager.save(participants);
  }
}
