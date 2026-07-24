import { UserGuard } from '@guards';
import { Context, ContextKey } from '@libs/context';
import { User } from '@modules/user/domain/user.entity';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { NotificationKind } from '../domain/device.entity';
import { GeneralDeviceService } from '../applications/general-device.service';
import { GeneralDeviceNotificationDto, GeneralDeviceRegisterDto } from './dto';

@Controller('devices')
@UseGuards(UserGuard)
export class GeneralDeviceController {
  constructor(
    private readonly generalDeviceService: GeneralDeviceService,
    private readonly context: Context
  ) {}

  /** 기기 등록/갱신 — 로그인 직후·토큰 갱신·권한 변경 시. 같은 기기면 upsert. */
  @Post()
  async register(@Body() body: GeneralDeviceRegisterDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalDeviceService.register({ ...body, user });

    // 4. Send response
    return { data };
  }

  /** 내 기기 목록. currentInstallationId 로 '이 기기'를 구분한다. */
  @Get()
  async list(@Query('installationId') installationId?: string) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalDeviceService.list({ user, currentInstallationId: installationId });

    // 4. Send response
    return { data };
  }

  /** 알림 종류별 수신 설정 변경. */
  @Put(':id/notifications')
  async changeNotifications(@Param('id', ParseIntPipe) id: number, @Body() body: GeneralDeviceNotificationDto) {
    // 1. Destructure body, params, query
    const settings: Partial<Record<NotificationKind, boolean>> = {
      [NotificationKind.RACE_STARTING_SOON]: body.raceStartingSoon,
      [NotificationKind.RACE_STARTED]: body.raceStarted,
      [NotificationKind.RACE_FINISHED]: body.raceFinished,
    };

    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    await this.generalDeviceService.changeNotificationSettings({ user, id, settings });

    // 4. Send response
    return { data: {} };
  }

  /** 기기 해지 — 다른 기기 로그아웃. */
  @Delete(':id')
  async revoke(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalDeviceService.revoke({ user, id });

    // 4. Send response
    return { data };
  }
}
