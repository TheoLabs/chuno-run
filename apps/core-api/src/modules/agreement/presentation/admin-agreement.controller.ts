import { AdminGuard } from '@guards';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminAgreementService } from '../applications/admin-agreement.service';
import { AdminAgreementCreateDto, AdminAgreementQueryDto } from './dto';

@Controller('admins/agreements')
@UseGuards(AdminGuard)
export class AdminAgreementController {
  constructor(private readonly adminAgreementService: AdminAgreementService) {}

  @Post()
  async create(@Body() body: AdminAgreementCreateDto) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    // 4. Send response
    return { data: {} };
  }

  @Get()
  async list(@Query() query: AdminAgreementQueryDto) {
    // 1. Destructure body, params, query
    const { types, statuses, required, ...options } = query;
    // 2. Get context
    // 3. Get result
    // 4. Send response
    return { data: {} };
  }

  @Get()
  async retrieve(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    // 4. Send response
    return { data: {} };
  }

  @Put()
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    // 4. Send response
    return { data: {} };
  }

  @Delete()
  async remove(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    // 4. Send response
    return { data: {} };
  }
}
