import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { SeatsService } from './seats.service.js';
import { CreateSeatDto } from './dtos/create-seat.dto.js';
import { ReplaceSeatDto } from './dtos/replace-seat.dto.js';
import { UpdateSeatDto } from './dtos/update-seat.dto.js';
import { SeatQueryDto } from './dtos/seat-query.dto.js';
import { Seats } from './entities/seats.entity.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';

@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Post('create-seat')
  @Roles(Role.Admin, Role.Organizer)
  async createSeat(@Body() seat: CreateSeatDto): Promise<Seats> {
    return await this.seatsService.createSeat(seat);
  }

  @Public()
  @Get()
  async getAllSeats(@Query() query: SeatQueryDto) {
    return await this.seatsService.getAllSeats(query);
  }

  @Public()
  @Get(':id')
  async getSeatById(@Param('id', ParseIntPipe) id: number): Promise<Seats> {
    return await this.seatsService.getSeatById(id);
  }

  @Put('updateSeatFully/:id')
  @Roles(Role.Admin, Role.Organizer)
  async updateSeatFully(
    @Param('id', ParseIntPipe) id: number,
    @Body() seat: ReplaceSeatDto,
  ): Promise<string> {
    return await this.seatsService.replaceSeat(id, seat);
  }

  @Patch('updateSeatPartially/:id')
  @Roles(Role.Admin, Role.Organizer)
  async updateSeatPartially(
    @Param('id', ParseIntPipe) id: number,
    @Body() seat: UpdateSeatDto,
  ): Promise<string> {
    return await this.seatsService.updateSeat(id, seat);
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Organizer)
  async deleteSeat(@Param('id', ParseIntPipe) id: number): Promise<string> {
    return await this.seatsService.deleteSeat(id);
  }
}