import { IsInt, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';

export class GeneralRoomChangeSettingDto {
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsInt()
  @Min(2)
  @IsOptional()
  capacity?: number;

  @IsInt()
  @Min(100)
  @Max(100000)
  @IsOptional()
  goalDistanceMeter?: number;

  @IsInt()
  @Min(5)
  @Max(1440)
  @IsOptional()
  goalLimitMinutes?: number;
}
