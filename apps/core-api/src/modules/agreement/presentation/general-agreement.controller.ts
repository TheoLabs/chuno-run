import { UserGuard } from '@guards';
import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { GeneralAgreementQueryDto } from './dto';
import { GeneralAgreementService } from '../applications/general-agreement.service';

@Controller('agreements')
@UseGuards(UserGuard)
export class GeneralAgreementController {
  constructor(private readonly generalAgreementService: GeneralAgreementService) {}

  @Get()
  async list(@Query() query: GeneralAgreementQueryDto) {
    // 1. Destructure body, params, query
    const { types, ...options } = query;

    // 2. Get context
    // 3. Get result
    const data = await this.generalAgreementService.list({ types }, options);

    // 4. Send response
    return { data };
  }

  @Get(':id')
  async retrieve(@Param('id', ParseIntPipe) id: number) {
    // 1. Destructure body, params, query
    // 2. Get context
    // 3. Get result
    const data = await this.generalAgreementService.retrieve({ id });

    // 4. Send response
    return { data };
  }
}
