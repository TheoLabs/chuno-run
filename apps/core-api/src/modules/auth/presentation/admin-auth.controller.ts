import { AdminGuard } from '@guards';
import { Context, ContextKey } from '@libs/context';
import { Admin } from '@modules/admin/domain/admin.entity';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminAuthService } from '../applications/admin-auth.service';
import { AdminGoogleLoginDto, AdminMeDto } from './dto';

@Controller('admins/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly context: Context
  ) {}

  @Post('google')
  async googleLogin(@Body() body: AdminGoogleLoginDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    const data = await this.adminAuthService.googleLogin(body);

    // 4. Send response
    return { data };
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me() {
    // 1. Destructure body, params, query
    // 2. Get context
    const admin = this.context.get<Admin>(ContextKey.ADMIN);

    // 3. Get result
    // 4. Send response
    return { data: admin.toInstance(AdminMeDto) };
  }
}
