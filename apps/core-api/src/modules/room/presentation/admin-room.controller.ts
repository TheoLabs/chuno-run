import { AdminGuard } from '@guards';
import { Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AdminRoomService } from '../applications/admin-room.service';
import { AdminRoomQueryDto } from './dto';

@Controller('admins/rooms')
@UseGuards(AdminGuard)
export class AdminRoomController {
  constructor(private readonly adminRoomService: AdminRoomService) {}

  /** 방 목록 — 상태 필터 + 제목·id 키워드 검색. */
  @Get()
  async list(@Query() query: AdminRoomQueryDto) {
    // 1. Destructure body, params, query
    const { statuses, searchKeys, searchValue, ...options } = query;

    // 2. Get context
    // 3. Get result
    const data = await this.adminRoomService.list({ statuses, searchKeys, searchValue }, options);

    // 4. Send response
    return { data };
  }

  /** 방 상세 — 참가자 진행 상황 포함. */
  @Get(':id')
  async retrieve(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    const data = await this.adminRoomService.retrieve({ id });

    // 4. Send response
    return { data };
  }

  /** 방 강제 취소 — 상태를 남기는 취소라 액션 경로로 표현한다. */
  @Post(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    const data = await this.adminRoomService.cancel({ id });

    // 4. Send response
    return { data };
  }
}
