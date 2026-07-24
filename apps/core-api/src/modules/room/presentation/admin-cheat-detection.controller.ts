import { AdminGuard } from '@guards';
import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AdminCheatDetectionService } from '../applications/admin-cheat-detection.service';
import { AdminCheatDetectionQueryDto } from './dto';

@Controller('admins/cheat-detections')
@UseGuards(AdminGuard)
export class AdminCheatDetectionController {
  constructor(private readonly adminCheatDetectionService: AdminCheatDetectionService) {}

  /** 탐지 이력 목록 — 유형 필터·검색·페이지네이션. */
  @Get()
  async list(@Query() query: AdminCheatDetectionQueryDto) {
    // 1. Destructure body, params, query
    const { types, searchKeys, searchValue, ...options } = query;

    // 2. Get context
    // 3. Get result
    const data = await this.adminCheatDetectionService.list({ types, searchKeys, searchValue }, options);

    // 4. Send response
    return { data };
  }

  /** 탐지 상세 — 관측값·조치·판정 근거 + 사용자·방 정보. */
  @Get(':id')
  async retrieve(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    const data = await this.adminCheatDetectionService.retrieve({ id });

    // 4. Send response
    return { data };
  }
}
