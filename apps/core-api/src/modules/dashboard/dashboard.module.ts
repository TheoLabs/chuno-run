import { Module } from '@nestjs/common';
import { AdminDashboardController } from './presentation/admin-dashboard.controller';
import { AdminDashboardService } from './applications/admin-dashboard.service';
import { RoomModule } from '@modules/room/room.module';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [RoomModule, UserModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
  exports: [],
})
export class DashboardModule {}
