import { DddRepository } from '@libs/ddd';
import { checkInValue, convertOptions, stripUndefined, TypeormRelationOptions } from '@libs/utils';
import { Injectable } from '@nestjs/common';
import { Device, DeviceStatus } from '../domain/device.entity';

export interface DeviceFindConditions {
  id?: number;
  ids?: number[];
  userId?: number;
  userIds?: number[];
  installationId?: string;
  statuses?: DeviceStatus[];
}

@Injectable()
export class DeviceRepository extends DddRepository<Device> {
  entityClass = Device;

  private toWhere(conditions: DeviceFindConditions) {
    return stripUndefined<Device>({
      id: conditions.ids ? checkInValue(conditions.ids) : conditions.id,
      userId: conditions.userIds ? checkInValue(conditions.userIds) : conditions.userId,
      installationId: conditions.installationId,
      status: checkInValue(conditions.statuses),
    });
  }

  async find(conditions: DeviceFindConditions, options?: TypeormRelationOptions<Device>) {
    return this.entityManager.find(this.entityClass, {
      where: this.toWhere(conditions),
      ...convertOptions(options),
    });
  }

  async count(conditions: DeviceFindConditions) {
    return this.entityManager.count(this.entityClass, {
      where: this.toWhere(conditions),
    });
  }
}
