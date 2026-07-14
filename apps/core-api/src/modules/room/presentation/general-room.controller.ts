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

  /**
   * 방 생성
   */
  @Post()
  async create(@Body() body: GeneralRoomCreateDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalRoomService.create({ ...body, user });

    // 4. Send response
    return { data };
  }

  /**
   * 방 목록 조회
   */
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

  /**
   * 방 상세 조회
   */
  @Get(':id')
  async retrieve(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalRoomService.retrieve({ user, id });

    // 4. Send response
    return { data };
  }

  /**
   * 방 정보 수정(방장 권한)
   */
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    // 4. Send response
    return { data: {} };
  }

  /**
   * 방 참가
   */
  @Post(':id/join')
  async join(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalRoomService.join({ user, id });

    // 4. Send response
    return { data };
  }

  /**
   * 방 나가기
   */
  @Post(':id/exit')
  async exit(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    const user = this.context.get<User>(ContextKey.USER);

    // 3. Get result
    const data = await this.generalRoomService.exit({ user, id });

    // 4. Send response
    return { data };
  }

  /**
   * 방 삭제(방장 권한)
   */
  @Delete(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    // 4. Send response
    return { data: {} };
  }
}
