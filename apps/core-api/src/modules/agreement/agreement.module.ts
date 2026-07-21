import { Module } from '@nestjs/common';
import { AgreementRepository } from './infrastructure/agreement.repository';
import { GeneralAgreementController } from './presentation/general-agreement.controller';
import { GeneralAgreementService } from './applications/general-agreement.service';
import { AdminAgreementController } from './presentation/admin-agreement.controller';
import { AdminAgreementService } from './applications/admin-agreement.service';

@Module({
  imports: [],
  controllers: [GeneralAgreementController, AdminAgreementController],
  providers: [AgreementRepository, GeneralAgreementService, AdminAgreementService],
  exports: [AgreementRepository],
})
export class AgreementModule {}
