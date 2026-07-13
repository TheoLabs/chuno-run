import { UserGuard } from '@guards';
import { Context, ContextKey } from '@libs/context';
import { Body, Controller, Post, Put, UseGuards } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { GeneralUserChangeNickname, GeneralUserOnboardingDto } from './dto';
import { GeneralUserService } from '../applications/general-user.service';

@Controller('users')
@UseGuards(UserGuard)
export class GeneralUserController {
  constructor(
    private readonly generalUserService: GeneralUserService,
    private readonly context: Context
  ) {}

  @Put('/me')
  async changeNickname(@Body() body: GeneralUserChangeNickname) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    await this.generalUserService.update({ ...body, user });

    // 4. Send response
    return { data: {} };
  }

  @Post('me/onboarding')
  async onboard(@Body() body: GeneralUserOnboardingDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    await this.generalUserService.onboard({ ...body, user });
    // 4. Send response

    return { data: {} };
  }
}
