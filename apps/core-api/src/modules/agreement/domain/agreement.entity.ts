import { today } from '@libs/date';
import { DddAggregate } from '@libs/ddd';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CalendarDate } from '@types';
import { zip } from 'lodash';
import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

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

  static compareVersion(a: string, b: string): number {
    const diff = zip(a.split('.').map(Number), b.split('.').map(Number))
      .map(([x = 0, y = 0]) => x - y)
      .find((d) => d !== 0);

    return Math.sign(diff ?? 0);
  }

  validVersion(version: string) {
    const cmp = Agreement.compareVersion(this.version, version);

    if (cmp > 0) {
      throw new BadRequestException('현재 등록된 버전보다 낮은 버전의 약관은 등록할 수 없습니다.', {
        description: '현재 등록된 버전보다 낮은 버전의 약관은 등록할 수 없습니다.',
      });
    }

    if (cmp === 0) {
      throw new BadRequestException('동일한 버전의 약관은 등록할 수 없습니다.', {
        description: '동일한 버전의 약관은 등록할 수 없습니다.',
      });
    }
  }

  edit(args: { title?: string; content?: string; expectedActivatedOn?: CalendarDate; required?: boolean }) {
    if (this.status !== AgreementStatus.PENDING) {
      throw new BadRequestException('대기중 상태의 약관만 수정할 수 있습니다.', {
        description: '대기중 상태의 약관만 수정할 수 있습니다.',
      });
    }

    if (args.expectedActivatedOn !== undefined) {
      if (args.expectedActivatedOn <= today()) {
        throw new BadRequestException('시행 예정일은 현재보다 미래 날짜를 선택해야합니다.', {
          description: '시행 예정일은 현재보다 미래 날짜를 선택해야합니다.',
        });
      }
      this.expectedActivatedOn = args.expectedActivatedOn;
    }

    const changed = this.stripUnchanged(args);

    if (!changed) {
      return;
    }

    Object.assign(this, changed);
  }

  archive() {
    if (this.status !== AgreementStatus.ACTIVE) {
      throw new ConflictException('보관할 수 없습니다.', {
        description: '오직 활성 중인 약관만 보관할 수 있습니다.',
      });
    }

    this.status = AgreementStatus.ARCHIVED;
  }

  activate() {
    if (this.status !== AgreementStatus.PENDING) {
      throw new ConflictException('오직 대기 중인 약관만 활성화할 수 있습니다.', {
        description: '오직 대기 중인 약관만 활성화할 수 있습니다.',
      });
    }

    this.status = AgreementStatus.ACTIVE;
  }
}
