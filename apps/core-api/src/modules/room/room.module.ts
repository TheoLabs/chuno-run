import { Module } from '@nestjs/common';
import { GeneralRoomController } from './presentation/general-room.controller';

@Module({
  imports: [],
  controllers: [GeneralRoomController],
  providers: [],
  exports: [],
})
export class RoomModule {}
