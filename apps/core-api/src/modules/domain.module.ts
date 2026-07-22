import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import { AgreementModule } from '@modules/agreement/agreement.module';
import { RoomModule } from './room/room.module';
import { AuthModule } from '@modules/auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { JobModule } from './job/job.module';

@Module({
  imports: [UserModule, AgreementModule, RoomModule, AuthModule, AdminModule, JobModule],
  exports: [UserModule, AgreementModule, RoomModule, AuthModule, AdminModule, JobModule],
})
export class DomainModule {}
