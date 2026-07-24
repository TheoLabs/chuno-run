import { DddEvent } from '@libs/ddd';
import { Room } from '@modules/room/domain/room.entity';
import { Participant } from '@modules/room/domain/participant.entity';
import { UserConsent } from '@modules/user/domain/user-consent.entity';
import { User } from '@modules/user/domain/user.entity';
import { Agreement } from '@modules/agreement/domain/agreement.entity';
import { Admin } from '@modules/admin/domain/admin.entity';
import { Device } from '@modules/device/domain/device.entity';
import { CheatDetection } from '@modules/room/domain/cheat-detection.entity';

export default [DddEvent, User, UserConsent, Room, Participant, Agreement, Admin, Device, CheatDetection];
