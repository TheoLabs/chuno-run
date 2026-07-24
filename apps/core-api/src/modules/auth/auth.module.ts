import { Module } from '@nestjs/common';
import { AdminModule } from '@modules/admin/admin.module';
import { GeneralAuthController } from './presentation/general-auth.controller';
import { GeneralAuthService } from './applications/general-auth.service';
import { AdminAuthController } from './presentation/admin-auth.controller';
import { AdminAuthService } from './applications/admin-auth.service';
import { GoogleModule } from '@libs/google';
import { OauthVerifierService } from './applications/oauth-verifier.service';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [AdminModule, GoogleModule, UserModule],
  controllers: [GeneralAuthController, AdminAuthController],
  providers: [GeneralAuthService, AdminAuthService, OauthVerifierService],
  exports: [GeneralAuthService, AdminAuthService],
})
export class AuthModule {}
