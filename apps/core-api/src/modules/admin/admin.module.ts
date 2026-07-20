import { Module } from '@nestjs/common';
import { AdminRepository } from './infrastructure/admin.repository';
import { AdminController } from './presentation/admin.controller';
import { AdminService } from './applications/admin.service';

@Module({
  imports: [],
  controllers: [AdminController],
  providers: [AdminRepository, AdminService],
  exports: [AdminRepository],
})
export class AdminModule {}
