import { UserGuard } from '@guards';
import { Context, ContextKey } from '@libs/context';
import { User } from '@modules/user/domain/user.entity';
import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { GeneralRaceService } from '../applications/general-race.service';
import { GeneralRaceHistoryQueryDto, GeneralRaceResyncDto } from './dto';

/**
 * 경주 조회 표면. 실시간 진행은 WebSocket(`/races`)이 담당하고, 여기서는 종료 후 결과와
 * 사용자별 이력처럼 **요청-응답으로 충분한 조회**만 다룬다.
 */
@Controller()
@UseGuards(UserGuard)
export class GeneralRaceController {
  constructor(
    private readonly generalRaceService: GeneralRaceService,
    private readonly context: Context
  ) {}

  /** 경주 결과 — 최종 순위와 참가자별 개인 기록(거리·시간·페이스). */
  @Get('rooms/:id/result')
  async getResult(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalRaceService.getResult({ user, roomId: id });

    // 4. Send response
    return { data };
  }

  /** [2차] 진행 중 경주 복귀 — 재실행 시 이어 달릴 방과 스냅샷. 시한 초과면 resumable=false. */
  @Get('races/active')
  async getActiveRace() {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalRaceService.getActiveRace({ user });

    // 4. Send response
    return { data };
  }

  /** [2차] 복귀 재동기화 — 기기가 보관한 누적 거리를 정합성 검사를 거쳐 반영한다. */
  @Post('rooms/:id/resync')
  async resync(@Param('id', ParseIntPipe) id: number, @Body() body: GeneralRaceResyncDto) {
    // 1. Destructure body, params, query
    const { distanceMeter } = body;

    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalRaceService.resync({ roomId: id, userId: user.id, distanceMeter });

    // 4. Send response
    return { data };
  }

  /** 내 경주 이력 — 참여했던 지난 경주 목록. */
  @Get('users/me/races')
  async listHistory(@Query() query: GeneralRaceHistoryQueryDto) {
    // 1. Destructure body, params, query
    const { statuses, ...options } = query;

    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalRaceService.listHistory({ user, statuses }, options);

    // 4. Send response
    return { data };
  }
}
