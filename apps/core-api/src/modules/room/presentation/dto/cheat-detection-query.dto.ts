import { ToArray } from '@libs/decorators';
import { PaginationDto } from '@libs/utils';
import { CheatType } from '@modules/room/domain/cheat-detection.entity';
import { CHEAT_DETECTION_SEARCH_COLUMNS } from '@modules/room/infrastructure/cheat-detection.repository';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

/** 관리자 탐지 이력 조회. 유형 필터 + id·설명 키워드 검색. */
export class AdminCheatDetectionQueryDto extends PaginationDto {
  @ToArray()
  @IsEnum(CheatType, { each: true })
  @IsOptional()
  types?: CheatType[];

  @ToArray()
  @IsIn(Object.keys(CHEAT_DETECTION_SEARCH_COLUMNS), { each: true })
  @IsOptional()
  searchKeys?: string[];

  @IsString()
  @IsOptional()
  searchValue?: string;
}
