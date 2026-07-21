import { AdminGuard } from '@guards';
import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminAgreementService } from '../applications/admin-agreement.service';
import { AdminAgreementCreateDto, AdminAgreementQueryDto, AdminAgreementUpdateDto } from './dto';

@Controller('admins/agreements')
@UseGuards(AdminGuard)
export class AdminAgreementController {
  constructor(private readonly adminAgreementService: AdminAgreementService) {}

  @Post()
  async create(@Body() body: AdminAgreementCreateDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    await this.adminAgreementService.create(body);

    // 4. Send response
    return { data: {} };
  }

  @Get()
  async list(@Query() query: AdminAgreementQueryDto) {
    // 1. Destructure body, params, query
    const { types, statuses, required, ...options } = query;

    // 2. Get context
    // 3. Get result
    const data = await this.adminAgreementService.list({ types, statuses, required }, options);

    // 4. Send response
    return { data };
  }

  @Get(':id')
  async retrieve(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    const data = await this.adminAgreementService.retrieve({ id });

    // 4. Send response
    return { data };
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: AdminAgreementUpdateDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    await this.adminAgreementService.update({ id, ...body });

    // 4. Send response
    return { data: {} };
  }

  @Put(':id/active')
  async activate(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    await this.adminAgreementService.activate({ id });

    // 4. Send response
    return { data: {} };
  }
}
