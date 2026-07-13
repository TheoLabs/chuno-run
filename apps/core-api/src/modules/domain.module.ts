import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import { AgreementModule } from '@modules/agreement/agreement.module';
import { RoomModule } from './room/room.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [UserModule, AgreementModule, RoomModule, AuthModule],
  exports: [UserModule, AgreementModule, RoomModule, AuthModule],
})
export class DomainModule {}
