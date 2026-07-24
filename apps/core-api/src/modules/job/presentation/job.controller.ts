import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminJobService } from '../applications/job.service';
import { AdminRoomJobService } from '../applications/room-job.service';
import { JobGuard } from '@guards';
import { JobScheduledDto, RoomTransitionJobDto } from './dto';

@Controller('admins/jobs')
@UseGuards(JobGuard)
export class AdminJobController {
  constructor(
    private readonly adminJobService: AdminJobService,
    private readonly adminRoomJobService: AdminRoomJobService
  ) {}

  @Post('agreements/active')
  async activateAgreements(@Body() body: JobScheduledDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    await this.adminJobService.activateAgreements(body);

    // 4. Send response
    return { data: {} };
  }

  /**
   * 방 상태 자동 전이 — 모집 마감(→ready/cancelled) · 출발(→live) · 제한 시간 만료 종료(→finished).
   * 짧은 주기로 반복 호출되는 것을 전제로 한다.
   */
  @Post('rooms/transition')
  async transitionRooms(@Body() body: RoomTransitionJobDto) {
    // 1. Destructure body, params, query
    const { scheduledOn } = body;

    // 2. Get context
    // 3. Get result
    const data = await this.adminRoomJobService.transitionRoomsAndNotify({ scheduledOn });

    // 4. Send response
    return { data };
  }
}
