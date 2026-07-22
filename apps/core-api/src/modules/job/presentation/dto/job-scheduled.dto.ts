import { CalendarDate } from '@types';
import { IsString } from 'class-validator';

export class JobScheduledDto {
  @IsString()
  scheduledOn: CalendarDate;
}
