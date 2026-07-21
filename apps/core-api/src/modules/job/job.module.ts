import { Module } from '@nestjs/common';
import { AdminJobController } from './presentation/job.controller';
import { AdminJobService } from './applications/job.service';
import { AgreementModule } from '@modules/agreement/agreement.module';

@Module({
  imports: [AgreementModule],
  controllers: [AdminJobController],
  providers: [AdminJobService],
  exports: [],
})
export class JobModule {}
