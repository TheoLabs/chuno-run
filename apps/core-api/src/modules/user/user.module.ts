import { AgreementModule } from '@modules/agreement/agreement.module';
import { Module } from '@nestjs/common';
import { GeneralUserController } from './presentation/general-user.controller';
import { AdminUserController } from './presentation/admin-user.controller';
import { UserRepository } from './infrastructure/user.repository';
import { GeneralUserService } from './applications/general-user.service';
import { AdminUserService } from './applications/admin-user.service';
import { RoomRepository } from '@modules/room/infrastructure/room.repository';
import { DeviceModule } from '@modules/device/device.module';

@Module({
  imports: [AgreementModule, DeviceModule],
  controllers: [GeneralUserController, AdminUserController],
  providers: [GeneralUserService, AdminUserService, UserRepository, RoomRepository],
  exports: [UserRepository],
})
export class UserModule {}
