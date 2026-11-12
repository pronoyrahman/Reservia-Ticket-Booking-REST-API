import { PartialType } from '@nestjs/mapped-types';
import { ReplaceResourceDto } from './replace-resource.dto.js';

export class UpdateResourceDto extends PartialType(ReplaceResourceDto) {}
