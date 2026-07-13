import { Module } from '@nestjs/common';
import { GeneralAuthController } from './presentation/general-auth.controller';
import { GeneralAuthService } from './applications/general-auth.service';

@Module({
  imports: [],
  controllers: [GeneralAuthController],
  providers: [GeneralAuthService],
  exports: [GeneralAuthService],
})
export class AuthModule {}
