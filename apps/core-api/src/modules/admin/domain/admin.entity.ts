import { DddAggregate } from '@libs/ddd';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AdminStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

type Ctor = {
  email: string;
};

@Entity()
export class Admin extends DddAggregate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: '구글 계정 이메일' })
  email: string;

  @Column({ unique: true, nullable: true, comment: '구글 계정 고유 id' })
  googleSub: string;

  @Column({ comment: '이름' })
  name: string;

  @Column({ type: 'enum', enum: AdminStatus })
  status: AdminStatus;

  private constructor(args: Ctor) {
    super();

    if (args) {
      this.email = args.email;
      this.status = AdminStatus.DISABLED;
    }
  }

  static of(args: Ctor) {
    return new Admin(args);
  }
}
