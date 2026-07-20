import { DddRepository } from '@libs/ddd';
import { Injectable } from '@nestjs/common';
import { Admin, AdminStatus } from '../domain/admin.entity';
import { checkInValue, convertOptions, stripUndefined, TypeormRelationOptions } from '@libs/utils';

@Injectable()
export class AdminRepository extends DddRepository<Admin> {
  entityClass = Admin;

  async find(
    conditions: { id?: number; email?: string; googleSub?: string; statuses?: AdminStatus[] },
    options?: TypeormRelationOptions<Admin>
  ) {
    return this.entityManager.find(this.entityClass, {
      where: stripUndefined({
        id: conditions.id,
        email: conditions.email,
        googleSub: conditions.googleSub,
        status: checkInValue(conditions.statuses),
      }),
      ...convertOptions(options),
    });
  }

  async count(conditions: { id?: number; email?: string; googleSub?: string; statuses?: AdminStatus[] }) {
    return this.entityManager.count(this.entityClass, {
      where: stripUndefined({
        id: conditions.id,
        email: conditions.email,
        googleSub: conditions.googleSub,
        status: checkInValue(conditions.statuses),
      }),
    });
  }
}
