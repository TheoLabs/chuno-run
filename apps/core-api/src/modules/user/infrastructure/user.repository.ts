import { DddRepository } from '@libs/ddd';
import { Injectable } from '@nestjs/common';
import { User, UserStatus } from '../domain/user.entity';
import { checkInValue, convertOptions, stripUndefined, TypeormRelationOptions } from '@libs/utils';

@Injectable()
export class UserRepository extends DddRepository<User> {
  entityClass = User;

  async find(
    conditions: { ids?: number[]; providerUserId?: string; statuses?: UserStatus[] },
    options?: TypeormRelationOptions<User>
  ) {
    return this.entityManager.find(this.entityClass, {
      where: stripUndefined({
        id: checkInValue(conditions.ids),
        providerUserId: conditions.providerUserId,
        status: checkInValue(conditions.statuses),
      }),
      ...convertOptions(options),
    });
  }

  async count(conditions: { ids?: number[]; providerUserId?: string; statuses?: UserStatus[] }) {
    return this.entityManager.count(this.entityClass, {
      where: stripUndefined({
        id: checkInValue(conditions.ids),
        providerUserId: conditions.providerUserId,
        status: checkInValue(conditions.statuses),
      }),
    });
  }
}
