import { ResponseDto } from '@libs/utils';
import { AdminStatus } from '@modules/admin/domain/admin.entity';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class AdminMeDto extends ResponseDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  name: string | null;

  @Expose()
  status: AdminStatus;
}
