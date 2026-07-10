import { Global, Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { TokenService } from './jwt.service';

@Global()
@Module({
  imports: [NestJwtModule.register({})],
  providers: [TokenService],
  exports: [TokenService],
})
export class JwtTokenModule {}
