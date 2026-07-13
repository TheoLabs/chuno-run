import { Module } from '@nestjs/common';
import { AgreementRepository } from './infrastructure/agreement.repository';
import { GeneralAgreementController } from './presentation/general-agreement.controller';
import { GeneralAgreementService } from './applications/general-agreement.service';

@Module({
  imports: [],
  controllers: [GeneralAgreementController],
  providers: [AgreementRepository, GeneralAgreementService],
  exports: [AgreementRepository],
})
export class AgreementModule {}
