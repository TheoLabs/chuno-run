import { DddEvent } from '@libs/ddd';
import { UserConsent } from '@modules/user/domain/user-consent.entity';
import { User } from '@modules/user/domain/user.entity';

export default [DddEvent, User, UserConsent];
