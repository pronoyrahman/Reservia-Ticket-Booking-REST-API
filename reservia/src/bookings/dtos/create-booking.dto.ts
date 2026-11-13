import { ArrayMinSize, ArrayUnique, IsArray, IsInt, Min } from 'class-validator';

export class CreateBookingDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  seat_ids!: number[];
}
