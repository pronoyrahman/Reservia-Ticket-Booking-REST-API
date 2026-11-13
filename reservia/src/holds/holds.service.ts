import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsWhere,
  In,
  MoreThan,
  Repository,
} from 'typeorm';
import { SeatHolds } from './entities/seat-holds.entity.js';
import { CreateHoldDto } from './dtos/create-hold.dto.js';
import { HoldQueryDto } from './dtos/hold-query.dto.js';
import { Users } from '../users/entities/users.entity.js';
import { Seats } from '../seats/entities/seats.entity.js';
import { Tickets } from '../tickets/entities/tickets.entity.js';
import { HoldStatus } from '../common/enums/hold-status.enum.js';
import { SeatStatus } from '../common/enums/seat-status.enum.js';
import { TicketStatus } from '../common/enums/ticket-status.enum.js';
import { Role } from '../common/enums/role.enum.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';

@Injectable()
export class HoldsService {
  constructor(
    @InjectRepository(SeatHolds)
    private readonly holdsRepo: Repository<SeatHolds>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}
  async createHold(hold: CreateHoldDto, userId: number): Promise<SeatHolds> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(Users, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) 
      {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      const seat = await queryRunner.manager
        .createQueryBuilder(Seats, 'seat')
        .innerJoinAndSelect('seat.resource', 'resource')
        .withDeleted()
        .where('seat.id = :seatId', { seatId: hold.seatId })
        .setLock('pessimistic_write', undefined, ['seat'])
        .getOne();
      if (!seat) {
        throw new NotFoundException(`Seat with id ${hold.seatId} not found`);
      }
      await queryRunner.manager
        .createQueryBuilder()
        .update(SeatHolds)
        .set({ status: HoldStatus.Expired })
        .where('seat_id = :seatId', { seatId: seat.id })
        .andWhere('status = :status', { status: HoldStatus.Active })
        .andWhere('expires_at <= now()')
        .execute();

      const resource = seat.resource;
      if (resource.deletedAt || !resource.isAvailable) {
        throw new ConflictException('This resource is not open for booking');
      }
      if (new Date(resource.startsAt) <= new Date()) {
        throw new ConflictException('This resource has already started');
      }

      if (seat.status === SeatStatus.Blocked) {
        throw new ConflictException(`Seat ${seat.seatNumber} is blocked`);
      }
      const activeHold = await queryRunner.manager.findOne(SeatHolds, {
        where: {
          seat: { id: seat.id },
          status: HoldStatus.Active,
          expiresAt: MoreThan(new Date()),
        },
      });
      if (activeHold) {
        throw new ConflictException(`Seat ${seat.seatNumber} is already held`);
      }
      const soldTicket = await queryRunner.manager.findOne(Tickets, {
        where: {
          seat: { id: seat.id },
          status: In([TicketStatus.Issued, TicketStatus.Used]),
        },
      });
      if (soldTicket) {
        throw new ConflictException(`Seat ${seat.seatNumber} is already sold`);
      }

      const maxSeats = Number(
        this.configService.get('MAX_SEATS_PER_CUSTOMER') ?? 4,
      );
      const myHolds = await queryRunner.manager.count(SeatHolds, {
        where: {
          user: { id: userId },
          seat: { resource: { id: resource.id } },
          status: HoldStatus.Active,
          expiresAt: MoreThan(new Date()),
        },
      });
      const myTickets = await queryRunner.manager.count(Tickets, {
        where: {
          booking: { user: { id: userId }, resource: { id: resource.id } },
          status: In([TicketStatus.Issued, TicketStatus.Used]),
        },
      });
      if (myHolds + myTickets >= maxSeats) {
        throw new ConflictException(
          `You can hold at most ${maxSeats} seats for this resource`,
        );
      }

      const minutes = Number(
        this.configService.get('HOLD_DURATION_MINUTES') ?? 15,
      );
      const newHold = queryRunner.manager.create(SeatHolds, {
        user: { id: userId },
        seat: { id: seat.id },
        status: HoldStatus.Active,
        expiresAt: new Date(Date.now() + minutes * 60 * 1000),
      });
      const saved = await queryRunner.manager.save(newHold);

      await queryRunner.commitTransaction();
      return await this.findHold(saved.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyActiveHolds(userId: number) {
    const holds = await this.holdsRepo.find({
      where: {
        user: { id: userId },
        status: HoldStatus.Active,
        expiresAt: MoreThan(new Date()),
      },
      relations: { seat: { resource: true } },
      order: { expiresAt: 'ASC' },
    });
    return holds.map((hold) => ({
      ...hold,
      remainingSeconds: this.remainingSeconds(hold.expiresAt),
    }));
  }

  async getAllHolds(query: HoldQueryDto): Promise<{
    data: SeatHolds[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: FindOptionsWhere<SeatHolds> = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.userId) {
      where.user = { id: query.userId };
    }
    if (query.resourceId) {
      where.seat = { resource: { id: query.resourceId } };
    }

    const [data, total] = await this.holdsRepo.findAndCount({
      where: where,
      relations: { user: true, seat: { resource: true } },
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getHoldById(id: number, user: JwtPayload): Promise<SeatHolds> {
    const hold = await this.findHold(id);
    this.checkOwner(hold, user);
    return hold;
  }

  async releaseHold(id: number, user: JwtPayload): Promise<string> {
    const hold = await this.findHold(id);
    this.checkOwner(hold, user);

    if (hold.bookingId) {
      throw new ConflictException(
        'This hold belongs to a booking; cancel or delete the booking instead',
      );
    }
    if (
      hold.status !== HoldStatus.Active ||
      new Date(hold.expiresAt) <= new Date()
    ) {
      throw new ConflictException('Only an active hold can be released');
    }

    hold.status = HoldStatus.Cancelled;
    await this.holdsRepo.save(hold);
    return `Hold with id ${id} released`;
  }

  private async findHold(id: number): Promise<SeatHolds> {
    const hold = await this.holdsRepo.findOne({
      where: { id: id },
      relations: { user: true, seat: { resource: true } },
    });
    if (!hold) {
      throw new NotFoundException(`Hold with id ${id} not found`);
    }
    return hold;
  }

  private checkOwner(hold: SeatHolds, user: JwtPayload): void {
    if (user.role !== Role.Admin && hold.user.id !== user.id) {
      throw new ForbiddenException('You can only access your own holds');
    }
  }

  private remainingSeconds(expiresAt: Date): number {
    return Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
    );
  }

  
}