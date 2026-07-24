import { Module } from '@nestjs/common';
import { AdminJobController } from './presentation/job.controller';
import { AdminJobService } from './applications/job.service';
import { AdminRoomJobService } from './applications/room-job.service';
import { LocalRoomScheduler } from './applications/local-room-scheduler';
import { AgreementModule } from '@modules/agreement/agreement.module';
import { RoomModule } from '@modules/room/room.module';
import { PushModule } from '@modules/push/push.module';

@Module({
  imports: [AgreementModule, RoomModule, PushModule],
  controllers: [AdminJobController],
  providers: [AdminJobService, AdminRoomJobService, LocalRoomScheduler],
  exports: [AdminRoomJobService],
})
export class JobModule {}
