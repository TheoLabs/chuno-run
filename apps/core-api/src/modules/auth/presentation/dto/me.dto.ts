import { ResponseDto } from '@libs/utils';
import { UserProvider, UserStatus } from '@modules/user/domain/user.entity';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class MeDto extends ResponseDto {
  @Expose()
  id: number;

  @Expose()
  status: UserStatus;

  @Expose()
  nickname: string;

  @Expose()
  profileImageUrl: string;

  @Expose()
  provider: UserProvider;
}
