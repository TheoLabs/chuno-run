import { CalendarDate } from '@types';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class GeneralRoomCreateDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  goalDistanceMeter: number;

  @IsInt()
  goalLimitMinutes: number;

  @IsString()
  startOn: CalendarDate;

  @IsInt()
  @Min(2)
  capacity: number;
}
