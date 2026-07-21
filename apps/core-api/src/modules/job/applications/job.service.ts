import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { AgreementRepository } from '@modules/agreement/infrastructure/agreement.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminJobService extends DddService {
  constructor(private readonly agreementRepository: AgreementRepository) {
    super();
  }

  @Transactional()
  async activateAgreements() {}
}
