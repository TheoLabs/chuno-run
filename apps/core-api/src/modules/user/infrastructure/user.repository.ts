import { DddRepository } from '@libs/ddd';
import { Injectable } from '@nestjs/common';
import { User, UserStatus } from '../domain/user.entity';
import { checkInValue, convertOptions, stripUndefined, TypeormRelationOptions } from '@libs/utils';

@Injectable()
export class UserRepository extends DddRepository<User> {
  entityClass = User;

  async find(
    conditions: { id?: number; providerUserId?: string; statuses?: UserStatus[] },
    options?: TypeormRelationOptions<User>
  ) {
    return this.entityManager.find(this.entityClass, {
      where: stripUndefined({
        id: conditions.id,
        providerUserId: conditions.providerUserId,
        status: checkInValue(conditions.statuses),
      }),
      ...convertOptions(options),
    });
  }

  async count(conditions: { id?: number; providerUserId?: string; statuses?: UserStatus[] }) {
    return this.entityManager.count(this.entityClass, {
      where: stripUndefined({
        id: conditions.id,
        providerUserId: conditions.providerUserId,
        status: checkInValue(conditions.statuses),
      }),
    });
  }
}
