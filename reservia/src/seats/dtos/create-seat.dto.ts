import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { SeatStatus } from '../../common/enums/seat-status.enum.js';

export class CreateSeatDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  resourceId: number;

  @Matches(/^[A-Z]$/, { message: 'rowLetter must be one capital letter A-Z' })
  @IsNotEmpty()
  rowLetter: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsNotEmpty()
  @Type(() => Number)
  columnNumber: number;

  @IsEnum(SeatStatus, { message: 'status must be available or blocked' })
  @IsOptional()
  status?: SeatStatus;

  @IsBoolean()
  @IsOptional()
  isAccessible?: boolean;
}