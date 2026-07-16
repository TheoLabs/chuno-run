import { DddRepository } from '@libs/ddd';
import { Injectable } from '@nestjs/common';
import { Room, RoomStatus } from '../domain/room.entity';
import { checkInValue, checkRangeValue, convertOptions, stripUndefined, TypeormRelationOptions } from '@libs/utils';
import { Participant } from '../domain/participant.entity';

@Injectable()
export class RoomRepository extends DddRepository<Room> {
  entityClass = Room;

  async find(
    conditions: {
      id?: number;
      hostUserId?: number;
      statuses?: RoomStatus[];
      minGoalDistanceMeter?: number;
      maxGoalDistanceMeter?: number;
      minGoalLimitMinutes?: number;
      maxGoalLimitMinutes?: number;
    },
    options?: TypeormRelationOptions<Room>
  ) {
    return this.entityManager.find(this.entityClass, {
      where: stripUndefined({
        id: conditions.id,
        hostUserId: conditions.hostUserId,
        status: checkInValue(conditions.statuses),
        goalDistanceMeter: checkRangeValue(conditions.minGoalDistanceMeter, conditions.maxGoalDistanceMeter),
      }),
      ...convertOptions(options),
    });
  }

  async count(conditions: {
    id?: number;
    hostUserId?: number;
    statuses?: RoomStatus[];
    minGoalDistanceMeter?: number;
    maxGoalDistanceMeter?: number;
    minGoalLimitMinutes?: number;
    maxGoalLimitMinutes?: number;
  }) {
    return this.entityManager.count(this.entityClass, {
      where: stripUndefined({
        id: conditions.id,
        hostUserId: conditions.hostUserId,
        status: checkInValue(conditions.statuses),
        goalDistanceMeter: checkRangeValue(conditions.minGoalDistanceMeter, conditions.maxGoalDistanceMeter),
      }),
    });
  }

  async findParticipants(conditions: { id?: number; userId?: number }, options?: TypeormRelationOptions<Participant>) {
    return this.entityManager.find(Participant, {
      where: stripUndefined({
        id: conditions.id,
        userId: conditions.userId,
      }),
      ...convertOptions(options),
    });
  }
}
