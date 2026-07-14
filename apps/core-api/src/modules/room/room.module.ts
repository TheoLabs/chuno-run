import { Module } from '@nestjs/common';
import { GeneralRoomController } from './presentation/general-room.controller';
import { RoomRepository } from './infrastructure/room.repository';
import { GeneralRoomService } from './applications/general-room.service';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [GeneralRoomController],
  providers: [RoomRepository, GeneralRoomService],
  exports: [RoomRepository],
})
export class RoomModule {}
