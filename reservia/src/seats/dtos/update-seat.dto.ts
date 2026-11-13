import { PartialType } from '@nestjs/mapped-types';
import { ReplaceSeatDto } from './replace-seat.dto.js';

export class UpdateSeatDto extends PartialType(ReplaceSeatDto) {}