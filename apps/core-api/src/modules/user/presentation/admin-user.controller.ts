import { AdminGuard } from '@guards';
import { Controller, Get, Param, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common';
import { AdminUserService } from '../applications/admin-user.service';
import { AdminUserQueryDto } from './dto';

@Controller('admins/users')
@UseGuards(AdminGuard)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  /** 사용자 목록 — 상태 필터 + 닉네임·id 키워드 검색. */
  @Get()
  async list(@Query() query: AdminUserQueryDto) {
    // 1. Destructure body, params, query
    const { statuses, searchKeys, searchValue, ...options } = query;

    // 2. Get context
    // 3. Get result
    const data = await this.adminUserService.list({ statuses, searchKeys, searchValue }, options);

    // 4. Send response
    return { data };
  }

  /** 사용자 상세 — 프로필·상태·가입 정보 + 참가 이력 요약. */
  @Get(':id')
  async retrieve(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    const data = await this.adminUserService.retrieve({ id });

    // 4. Send response
    return { data };
  }

  /** 이용 정지 (active → suspended). */
  @Put(':id/suspended')
  async suspend(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    await this.adminUserService.suspend({ id });

    // 4. Send response
    return { data: {} };
  }

  /** 정지 해제 (suspended → active). */
  @Put(':id/active')
  async activate(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    await this.adminUserService.activate({ id });

    // 4. Send response
    return { data: {} };
  }
}
