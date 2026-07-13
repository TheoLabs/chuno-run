import { Module } from '@nestjs/common';
import { GeneralAuthController } from './presentation/general-auth.controller';
import { AuthService } from './applications/auth.service';

@Module({
  imports: [],
  controllers: [GeneralAuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
