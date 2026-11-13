
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { HoldsService } from './holds.service.js';
import { CreateHoldDto } from './dtos/create-hold.dto.js';
import { HoldQueryDto } from './dtos/hold-query.dto.js';
import { SeatHolds } from './entities/seat-holds.entity.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';

@Controller('holds')
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  @Post('create-hold')
  @Roles(Role.Customer)
  async createHold(
    @Body() hold: CreateHoldDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SeatHolds> {
    return await this.holdsService.createHold(hold, user.id);
  }

  @Get('active')
  @Roles(Role.Customer)
  async getMyActiveHolds(@CurrentUser() user: JwtPayload) {
    return await this.holdsService.getMyActiveHolds(user.id);
  }

  @Get()
  @Roles(Role.Admin)
  async getAllHolds(@Query() query: HoldQueryDto) {
    return await this.holdsService.getAllHolds(query);
  }

  @Get(':id')
  @Roles(Role.Customer, Role.Admin)
  async getHoldById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<SeatHolds> {
    return await this.holdsService.getHoldById(id, user);
  }

  @Delete(':id')
  @Roles(Role.Customer, Role.Admin)
  async releaseHold(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<string> {
    return await this.holdsService.releaseHold(id, user);
  }
}