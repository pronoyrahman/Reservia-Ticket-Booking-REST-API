import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, Min } from 'class-validator';

export class MockWebhookDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  payment_id!: number;

  @IsIn(['completed', 'failed'])
  status!: 'completed' | 'failed';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
}
