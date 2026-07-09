import { today } from '@libs/date';
import { DddAggregate } from '@libs/ddd';
import { BadRequestException } from '@nestjs/common';
import { CalendarDate } from '@types';
import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export enum AgreementType {
  SERVICE = 'service',
  PRIVACY = 'privacy',
  LOCATION = 'location',
  MARKETING = 'marketing',
}

export enum AgreementStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

type Ctor = {
  type: AgreementType;
  version: string;
  required: boolean;
  title: string;
  content: string;
  expectedActivatedOn: CalendarDate;
};

@Entity()
@Unique('unique_agreement_type_version', ['type', 'version'])
export class Agreement extends DddAggregate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: AgreementType, comment: '약관 유형' })
  type: AgreementType;

  @Column({ comment: '약관 버전(예: 1.0)' })
  version: string;

  @Column({ comment: '필수 동의 여부' })
  required: boolean;

  @Column({ type: 'enum', enum: AgreementStatus })
  status: AgreementStatus;

  @Column({ comment: '약관 제목' })
  title: string;

  @Column({ type: 'text', comment: '약관 본문' })
  content: string;

  @Column({ comment: '시행 예정일 (YYYY-MM-DD)' })
  expectedActivatedOn: CalendarDate;

  private constructor(args: Ctor) {
    super();

    if (args) {
      this.type = args.type;
      this.version = args.version;
      this.required = args.required;
      this.status = AgreementStatus.PENDING;
      this.title = args.title;
      this.content = args.content;
      this.expectedActivatedOn = args.expectedActivatedOn;
    }
  }

  static create(args: Ctor) {
    if (args.expectedActivatedOn <= today()) {
      throw new BadRequestException('시행 예정일은 현재보다 미래 날짜를 선택해야합니다.', {
        description: '시행 예정일은 현재보다 미래 날짜를 선택해야합니다.',
      });
    }

    return new Agreement(args);
  }
}
