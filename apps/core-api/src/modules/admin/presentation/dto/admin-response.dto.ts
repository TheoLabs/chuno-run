import { ResponseDto } from '@libs/utils';
import { AdminStatus } from '@modules/admin/domain/admin.entity';
import { Exclude, Expose } from 'class-transformer';

/** 관리자 계정 한 줄. googleSub 같은 내부 식별자는 노출하지 않는다. */
@Exclude()
export class AdminResponseDto extends ResponseDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  name: string | null;

  @Expose()
  status: AdminStatus;
}
