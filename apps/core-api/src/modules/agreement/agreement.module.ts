import { Module } from '@nestjs/common';
import { AgreementRepository } from './infrastructure/agreement.repository';
import { GeneralAgreementController } from './presentation/general-agreement.controller';
import { AgreementService } from './applications/agreement.service';

@Module({
  imports: [],
  controllers: [GeneralAgreementController],
  providers: [AgreementRepository, AgreementService],
  exports: [AgreementRepository],
})
export class AgreementModule {}
