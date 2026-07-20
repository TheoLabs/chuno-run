import { Module } from '@nestjs/common';
import { AdminModule } from '@modules/admin/admin.module';
import { GeneralAuthController } from './presentation/general-auth.controller';
import { GeneralAuthService } from './applications/general-auth.service';
import { AdminAuthController } from './presentation/admin-auth.controller';
import { AdminAuthService } from './applications/admin-auth.service';

@Module({
  imports: [AdminModule],
  controllers: [GeneralAuthController, AdminAuthController],
  providers: [GeneralAuthService, AdminAuthService],
  exports: [GeneralAuthService, AdminAuthService],
})
export class AuthModule {}
