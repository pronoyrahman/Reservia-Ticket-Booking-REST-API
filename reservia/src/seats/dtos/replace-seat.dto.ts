import { OmitType } from '@nestjs/swagger';
import { CreateSeatDto } from './create-seat.dto.js';

export class ReplaceSeatDto extends OmitType(CreateSeatDto, [
  'resourceId',
] as const) {}