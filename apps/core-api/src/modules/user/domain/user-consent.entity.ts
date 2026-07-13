import { today } from '@libs/date';
import { DddBaseAggregate } from '@libs/ddd';
import { User } from '@modules/user/domain/user.entity';
import { CalendarDate } from '@types';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

type Ctor = {
  agreementId: number;
  isAgreed: boolean;
};

@Entity()
@Unique('unique_user_consent_user_id_agreement_id', ['userId', 'agreementId'])
export class UserConsent extends DddBaseAggregate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ comment: '대상 약관 ID' })
  agreementId: number;

  @Column({ comment: '동의 약관 여부' })
  isAgreed: boolean;

  @Column({ comment: '처리시각 (YYYY-MM-DD HH:mm:ss)' })
  consentedOn: CalendarDate;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  private constructor(args: Ctor) {
    super();

    if (args) {
      this.agreementId = args.agreementId;
      this.isAgreed = args.isAgreed;
      this.consentedOn = today('YYYY-MM-DD HH:mm:ss');
    }
  }

  static create(args: Ctor) {
    return new UserConsent(args);
  }
}
