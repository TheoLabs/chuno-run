import { AgreementModule } from '@modules/agreement/agreement.module';
import { Module } from '@nestjs/common';
import { GeneralUserController } from './presentation/general-user.controller';
import { UserRepository } from './infrastructure/user.repository';
import { GeneralUserService } from './applications/general-user.service';

@Module({
  imports: [AgreementModule],
  controllers: [GeneralUserController],
  providers: [GeneralUserService, UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
