import { PartialType } from '@nestjs/swagger';
import { ReplaceSeatDto } from './replace-seat.dto.js';

export class UpdateSeatDto extends PartialType(ReplaceSeatDto) {}