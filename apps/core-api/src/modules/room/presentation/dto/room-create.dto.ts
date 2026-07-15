import { CalendarDate } from '@types';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class GeneralRoomCreateDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @Min(100)
  @Max(100000)
  goalDistanceMeter: number;

  @IsInt()
  @Min(5)
  @Max(1440)
  goalLimitMinutes: number;

  @IsString()
  startOn: CalendarDate;

  @IsInt()
  @Min(2)
  capacity: number;
}
