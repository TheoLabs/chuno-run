import { DddService } from '@libs/ddd';
import { Injectable } from '@nestjs/common';
import { AgreementRepository } from '../infrastructure/agreement.repository';
import { Transactional } from '@libs/decorators';
import { Agreement, AgreementStatus, AgreementType } from '../domain/agreement.entity';
import { PaginationOptions } from '@libs/utils';
import { AdminAgreementResponseDto } from '../presentation/dto';
import { CalendarDate } from '@types';

@Injectable()
export class AdminAgreementService extends DddService {
  constructor(private readonly agreementRepository: AgreementRepository) {
    super();
  }

  @Transactional()
  async create({
    type,
    version,
    required,
    title,
    content,
    expectedActivatedOn,
  }: {
    type: AgreementType;
    version: string;
    required: boolean;
    title: string;
    content: string;
    expectedActivatedOn: CalendarDate;
  }) {
    const existingAgreements = await this.agreementRepository.find({ types: [type] });

    const [latest] = existingAgreements.sort((a, b) => Agreement.compareVersion(b.version, a.version));

    latest?.validVersion(version);

    const agreement = Agreement.create({
      type,
      version,
      required,
      title,
      content,
      expectedActivatedOn,
    });

    await this.agreementRepository.save([agreement]);
  }

  async list(
    {
      statuses,
      types,
      required,
    }: {
      statuses?: AgreementStatus[];
      types?: AgreementType[];
      required?: boolean[];
    },
    options?: PaginationOptions
  ) {
    const [agreements, total] = await Promise.all([
      this.agreementRepository.find({ statuses, types, required }, { options }),
      this.agreementRepository.count({ statuses, types, required }),
    ]);

    return { items: agreements.map((agreement) => agreement.toInstance(AdminAgreementResponseDto)), total };
  }

  async retrieve({ id }: { id: number }) {}

  @Transactional()
  async update({ id }: { id: number }) {}

  @Transactional()
  async remove({ id }: { id: number }) {}
}
