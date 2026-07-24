import { Module } from '@nestjs/common';
import { GeneralRoomController } from './presentation/general-room.controller';
import { GeneralRaceController } from './presentation/general-race.controller';
import { AdminRoomController } from './presentation/admin-room.controller';
import { AdminCheatDetectionController } from './presentation/admin-cheat-detection.controller';
import { RaceGateway } from './presentation/race.gateway';
import { RoomRepository } from './infrastructure/room.repository';
import { CheatDetectionRepository } from './infrastructure/cheat-detection.repository';
import { GeneralRoomService } from './applications/general-room.service';
import { GeneralRaceService } from './applications/general-race.service';
import { AdminRoomService } from './applications/admin-room.service';
import { AdminCheatDetectionService } from './applications/admin-cheat-detection.service';
import { RaceRevalidationService } from './applications/race-revalidation.service';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [GeneralRoomController, GeneralRaceController, AdminRoomController, AdminCheatDetectionController],
  providers: [
    RoomRepository,
    CheatDetectionRepository,
    GeneralRoomService,
    GeneralRaceService,
    AdminRoomService,
    AdminCheatDetectionService,
    RaceRevalidationService,
    RaceGateway,
  ],
  exports: [RoomRepository, GeneralRaceService],
})
export class RoomModule {}
