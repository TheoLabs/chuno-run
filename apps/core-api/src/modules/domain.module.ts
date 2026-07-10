import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import { AgreementModule } from '@modules/agreement/agreement.module';
import { RoomModule } from './room/room.module';

@Module({
  imports: [UserModule, AgreementModule, RoomModule],
  exports: [UserModule, AgreementModule, RoomModule],
})
export class DomainModule {}
