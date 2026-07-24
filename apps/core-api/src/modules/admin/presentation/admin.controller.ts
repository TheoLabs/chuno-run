import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminService } from '../applications/admin.service';
import { AdminPreRegisterDto, AdminQueryDto } from './dto';
import { AdminGuard } from '@guards';
import { Context, ContextKey } from '@libs/context';
import { Admin } from '../domain/admin.entity';

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
    const { statuses, ...options } = query;

    // 2. Get context
    // 3. Get result
    const data = await this.adminService.list({ statuses }, options);

    // 4. Send response
    return { data };
  }

  /** 관리자 계정 비활성화 — 이후 구글 로그인이 거부된다. */
  @Put(':id/disabled')
  async disable(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    const admin = this.context.get<Admin>(ContextKey.ADMIN);

    // 3. Get result
    await this.adminService.disable({ id, requesterId: admin.id });

    // 4. Send response
    return { data: {} };
  }

  /** 관리자 계정 재활성화. */
  @Put(':id/active')
  async activate(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    await this.adminService.activate({ id });

    // 4. Send response
    return { data: {} };
  }
}
