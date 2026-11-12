import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ResourceType } from '../../common/enums/resource-type.enum.js';

export class CreateResourceDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  @Type(() => Number)
  locationId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(150)
  name: string;

  @IsEnum(ResourceType, {
    message: 'type must be one of: concert, movie, bus, seminar, other',
  })
  @IsNotEmpty()
  type: ResourceType;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  startsAt: Date;

  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  endsAt: Date;

  @IsInt()
  @Min(1)
  @Max(260)
  @IsNotEmpty()
  @Type(() => Number)
  capacity: number;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  seatsPerRow?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  @Type(() => Number)
  pricePerTicket: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
