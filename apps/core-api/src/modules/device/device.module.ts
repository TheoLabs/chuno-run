import { Module } from '@nestjs/common';
import { GeneralDeviceController } from './presentation/general-device.controller';
import { GeneralDeviceService } from './applications/general-device.service';
import { DeviceRepository } from './infrastructure/device.repository';

@Module({
  controllers: [GeneralDeviceController],
  providers: [GeneralDeviceService, DeviceRepository],
  exports: [DeviceRepository, GeneralDeviceService],
})
export class DeviceModule {}
