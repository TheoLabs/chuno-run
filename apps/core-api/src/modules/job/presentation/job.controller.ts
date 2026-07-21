import { Controller } from '@nestjs/common';
import { AdminJobService } from '../applications/job.service';

@Controller('admins/jobs')
export class AdminJobController {
  constructor(private readonly adminJobService: AdminJobService) {}
}
