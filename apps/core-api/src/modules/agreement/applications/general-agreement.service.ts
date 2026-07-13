import { DddService } from '@libs/ddd';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AgreementRepository } from '../infrastructure/agreement.repository';
import { AgreementStatus, AgreementType } from '../domain/agreement.entity';
import { PaginationOptions } from '@libs/utils';
import { GeneralAgreementResponseDto } from '../presentation/dto/agreement-response.dto';

@Injectable()
export class GeneralAgreementService extends DddService {
  constructor(private readonly agreementRepository: AgreementRepository) {
    super();
  }

  async list(
    { types, statuses }: { types?: AgreementType[]; statuses?: AgreementStatus[] },
    options?: PaginationOptions
  ) {
    const [agreements, total] = await Promise.all([
      this.agreementRepository.find({ types, statuses }, { options }),
      this.agreementRepository.count({ types, statuses: [AgreementStatus.ACTIVE, AgreementStatus.ARCHIVED] }),
    ]);

    return {
      items: agreements.map((agreement) => agreement.toInstance(GeneralAgreementResponseDto)),
      total,
    };
  }

  async retrieve({ id }: { id: number }) {
    const [agreement] = await this.agreementRepository.find({
      ids: [id],
      statuses: [AgreementStatus.ACTIVE, AgreementStatus.ARCHIVED],
    });

    if (!agreement) {
      throw new NotFoundException('존재하지 않는 약관입니다.', {
        description: '존재하지 않는 약관입니다.',
      });
    }

    return agreement.toInstance(GeneralAgreementResponseDto);
  }
}
