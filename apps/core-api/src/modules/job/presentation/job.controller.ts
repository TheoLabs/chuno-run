import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminJobService } from '../applications/job.service';
import { CalendarDate } from '@types';
import { AdminGuard } from '@guards';

@Controller('admins/jobs')
@UseGuards(AdminGuard)
export class AdminJobController {
  constructor(private readonly adminJobService: AdminJobService) {}

  @Post('agreements/active')
  async activateAgreements(@Body() body: { scheduledOn?: CalendarDate }) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    await this.adminJobService.activateAgreements(body);

    // 4. Send response
    return { data: {} };
  }
}
