import { UserGuard } from '@guards';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { GeneralRoomCreateDto, GeneralRoomQueryDto } from './dto';
import { Context, ContextKey } from '@libs/context';
import { User } from '@modules/user/domain/user.entity';
import { GeneralRoomService } from '../applications/general-room.service';

@Controller('rooms')
@UseGuards(UserGuard)
export class GeneralRoomController {
  constructor(
    private readonly generalRoomService: GeneralRoomService,
    private readonly context: Context
  ) {}

  @Post()
  async create(@Body() body: GeneralRoomCreateDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    await this.generalRoomService.create({ ...body, user });

    // 4. Send response
    return { data: {} };
  }

  @Get()
  async list(@Query() query: GeneralRoomQueryDto) {
    // 1. Destructure body, params, query
    const {
      statuses,
      minGoalDistanceMeter,
      maxGoalDistanceMeter,
      minGoalLimitMinutes,
      maxGoalLimitMinutes,
      ...options
    } = query;

    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalRoomService.list(
      {
        user,
        statuses,
        minGoalDistanceMeter,
        maxGoalDistanceMeter,
        minGoalLimitMinutes,
        maxGoalLimitMinutes,
      },
      options
    );

    // 4. Send response
    return { data };
  }

  @Get(':id')
  async retrieve(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    // 4. Send response
    return { data: {} };
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    // 4. Send response
    return { data: {} };
  }

  @Delete(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    // 4. Send response
    return { data: {} };
  }
}
