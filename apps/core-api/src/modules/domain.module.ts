import { Module } from '@nestjs/common';
import { UserModule } from '@modules/user/user.module';
import { AgreementModule } from '@modules/agreement/agreement.module';

@Module({
  imports: [UserModule, AgreementModule],
  exports: [UserModule, AgreementModule],
})
export class DomainModule {}
