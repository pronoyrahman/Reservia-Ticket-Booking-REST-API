
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateHoldDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  seatId: number;

}