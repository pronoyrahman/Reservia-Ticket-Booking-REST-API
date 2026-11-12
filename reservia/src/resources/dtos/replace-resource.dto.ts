import { OmitType } from '@nestjs/mapped-types';
import { CreateResourceDto } from './create-resource.dto.js';

export class ReplaceResourceDto extends OmitType(CreateResourceDto, [
  'capacity',
  'seatsPerRow',
] as const) {}
