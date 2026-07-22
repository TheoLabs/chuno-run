import { today } from '@chuno/date';
import { DddService } from '@libs/ddd';
import { Transactional } from '@libs/decorators';
import { AgreementStatus } from '@modules/agreement/domain/agreement.entity';
import { AgreementRepository } from '@modules/agreement/infrastructure/agreement.repository';
import { Injectable } from '@nestjs/common';
import { CalendarDate } from '@types';

@Injectable()
export class AdminJobService extends DddService {
  constructor(private readonly agreementRepository: AgreementRepository) {
    super();
  }

  @Transactional()
  async activateAgreements({ scheduledOn }: { scheduledOn?: CalendarDate }) {
    const day = scheduledOn || today();

    // 시행일이 기준일(day)까지 도달한 pending을 전부 조회한다(<=). 실행 누락일이 있어도 다음 실행에서 catch-up.
    const pendingAgreements = await this.agreementRepository.find({
      expectedActivatedOnUntil: day,
      statuses: [AgreementStatus.PENDING],
    });

    const currentActivatedAgreements = await this.agreementRepository.find({
      types: [...new Set(pendingAgreements.map((agreement) => agreement.type))],
      statuses: [AgreementStatus.ACTIVE],
    });

    pendingAgreements.forEach((agreement) => agreement.activate());
    currentActivatedAgreements.forEach((agreement) => agreement.archive());

    await this.agreementRepository.save([...pendingAgreements, ...currentActivatedAgreements]);
  }
}
