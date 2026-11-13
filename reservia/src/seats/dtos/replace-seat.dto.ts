import { OmitType } from '@nestjs/mapped-types';
import { CreateSeatDto } from './create-seat.dto.js';

export class ReplaceSeatDto extends OmitType(CreateSeatDto, [
  'resourceId',
] as const) {}