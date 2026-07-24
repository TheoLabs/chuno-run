import { AdminGuard } from '@guards';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from '../applications/admin-dashboard.service';

@Controller('admins/dashboard')
@UseGuards(AdminGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  /** 운영 대시보드 지표 — 가입자·방·오늘 경주·완주율·최근 경주. */
  @Get()
  async summary() {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    const data = await this.adminDashboardService.summary();

    // 4. Send response
    return { data };
  }
}
