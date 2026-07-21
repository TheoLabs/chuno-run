import { DddService } from '@libs/ddd';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

    if (latest) {
      if (latest.status === AgreementStatus.PENDING) {
        throw new ConflictException('아직 배포되지 않은 약관이 있어 새 약관을 등록할 수 없습니다.', {
          description: '아직 배포되지 않은 약관이 있어 새 약관을 등록할 수 없습니다.',
        });
      }
      latest.validVersion(version);
    }

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

  async retrieve({ id }: { id: number }) {
    const [agreement] = await this.agreementRepository.find({ ids: [id] });

    if (!agreement) {
      throw new NotFoundException('존재하지 않는 약관입니다.');
    }

    return agreement.toInstance(AdminAgreementResponseDto);
  }

  @Transactional()
  async update({
    id,
    title,
    content,
    expectedActivatedOn,
    required,
  }: {
    id: number;
    title?: string;
    content?: string;
    expectedActivatedOn?: CalendarDate;
    required?: boolean;
  }) {
    const [agreement] = await this.agreementRepository.find({ ids: [id] });

    if (!agreement) {
      throw new NotFoundException('존재하지 않는 약관입니다.');
    }

    agreement.edit({ title, content, expectedActivatedOn, required });

    await this.agreementRepository.save([agreement]);
  }

  @Transactional()
  async activate({ id }: { id: number }) {
    const [agreement] = await this.agreementRepository.find({
      ids: [id],
      statuses: [AgreementStatus.PENDING],
    });

    if (!agreement) {
      throw new BadRequestException('존재하지 않는 약관이거나, 이미 활성화되어 있습니다.', {
        description: '존재하지 않는 약관이거나, 이미 활성화되어 있습니다.',
      });
    }

    const currentActivatedAgreements = await this.agreementRepository.find({
      types: [agreement.type],
      statuses: [AgreementStatus.ACTIVE],
    });

    currentActivatedAgreements.forEach((currentActivatedAgreement) => currentActivatedAgreement.archive());

    agreement.activate();

    await this.agreementRepository.save([...currentActivatedAgreements, agreement]);
  }
}
