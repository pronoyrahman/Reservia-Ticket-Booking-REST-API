import { PartialType } from '@nestjs/swagger';
import { ReplaceResourceDto } from './replace-resource.dto.js';

export class UpdateResourceDto extends PartialType(ReplaceResourceDto) {}
