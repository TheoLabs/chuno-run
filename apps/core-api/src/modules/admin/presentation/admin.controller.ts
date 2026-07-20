import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminService } from '../applications/admin.service';
import { AdminPreRegisterDto, AdminQueryDto } from './dto';
import { AdminGuard } from '@guards';
import { Context } from '@libs/context';

@Controller('admins')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly context: Context
  ) {}

  @Post()
  async preRegister(@Body() body: AdminPreRegisterDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    await this.adminService.preRegister(body);

    // 4. Send response
    return { data: {} };
  }

  @Get()
  async list(@Query() query: AdminQueryDto) {
    // 1. Destructure body, params, query
    const { ...options } = query;

    // 2. Get context
    // 3. Get result
    // 4. Send response
    return { data: {} };
  }
}
