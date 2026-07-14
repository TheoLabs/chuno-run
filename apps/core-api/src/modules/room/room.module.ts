import { Module } from '@nestjs/common';
import { GeneralRoomController } from './presentation/general-room.controller';
import { RoomRepository } from './infrastructure/room.repository';
import { GeneralRoomService } from './applications/general-room.service';

@Module({
  imports: [],
  controllers: [GeneralRoomController],
  providers: [RoomRepository, GeneralRoomService],
  exports: [RoomRepository],
})
export class RoomModule {}
