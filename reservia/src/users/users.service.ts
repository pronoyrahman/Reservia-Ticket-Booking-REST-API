import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Users } from './entities/users.entity.js';
import { CreateUserDto } from './dtos/create-user.dto.js';
import { UpdateUserDto } from './dtos/update-user.dto.js';
import { GetUsersQueryDto } from './dtos/get-users-query.dto.js';
import { ReplaceUserDto } from './dtos/replace-user.dto.js';
import { Locations } from '../locations/entities/locations.entity.js';
import { Resources } from '../resources/entities/resources.entity.js';
import { SeatHolds } from '../holds/entities/seat-holds.entity.js';
import { Bookings } from '../bookings/entities/bookings.entity.js';
import { Role } from '../common/enums/role.enum.js';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    private readonly configService: ConfigService,
  ) {}

  // creates the first admin from .env when the app starts (README BR-22)
  async onModuleInit(): Promise<void> {
    const email = this.configService.getOrThrow<string>('SEED_ADMIN_EMAIL');
    const usr = await this.usersRepo.findOneBy({ email: email });
    if (usr) {
      return;
    }

    const admin = this.usersRepo.create({
      name: 'System Admin',
      email: email,
      passwordHash: await this.hashPassword(
        this.configService.getOrThrow<string>('SEED_ADMIN_PASSWORD'),
      ),
      role: Role.Admin,
    });
    await this.usersRepo.save(admin);
  }

  private async hashPassword(password: string): Promise<string> {
    const rounds = Number(this.configService.get('BCRYPT_SALT_ROUNDS') ?? 10);
    return await bcrypt.hash(password, rounds);
  }

  private async checkEmailFree(email: string, ownId?: number): Promise<void> {
    const usr = await this.usersRepo.findOneBy({ email: email });
    if (usr && usr.id !== ownId) {
      throw new ConflictException(`email ${email} is already registered`);
    }
  }

  async createUser(user: CreateUserDto): Promise<Users> {
    await this.checkEmailFree(user.email);

    const { password, ...rest } = user;
    let saved: Users;
    try {
      const userEntity = this.usersRepo.create({
        ...rest,
        passwordHash: await this.hashPassword(password),
      });
      saved = await this.usersRepo.save(userEntity);
    } catch {
      throw new BadRequestException('Failed to create user');
    }

    return await this.getUserById(saved.id);
  }

  async getAllUsers(query: GetUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { role, search } = query;

    let where: object | object[] = role ? { role: role } : {};
    if (search) {
      where = [
        { ...where, name: ILike(`%${search}%`) },
        { ...where, email: ILike(`%${search}%`) },
      ];
    }

    const [users, total] = await this.usersRepo.findAndCount({
      where: where,
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: users,
      meta: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: number): Promise<Users> {
    const usr = await this.usersRepo.findOneBy({ id: id });
    if (!usr) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return usr;
  }

  // only for login: password_hash is select: false, so it is asked for here
  async getUserByEmailWithPassword(email: string): Promise<Users | null> {
    return await this.usersRepo.findOne({
      where: { email: email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });
  }

    async replaceUser(id: number, user: ReplaceUserDto): Promise<Users> {
    return await this.updateUser(id, user);
  }

  async updateUser(id: number, user: UpdateUserDto): Promise<Users> {
    const usr = await this.getUserById(id);
    if (user.email) {
      await this.checkEmailFree(user.email, id);
    }


    if (user.role && user.role !== usr.role && (await this.isUserInUse(id))) {
      throw new ConflictException(
        `User with id ${id} owns locations, resources, holds or bookings, so the role cannot be changed; set isActive to false instead`,
      );
    }

    const { password, ...rest } = user;
    const updateData: Partial<Users> = { ...rest };
    if (password) {
      updateData.passwordHash = await this.hashPassword(password);
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    const res = (await this.usersRepo.update(id, updateData)).affected;
    if (res == null || res === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return await this.getUserById(id);
  }

  async deleteUser(id: number): Promise<string> {
    await this.getUserById(id);

    // BR-21: a user who owns records cannot be deleted
    if (await this.isUserInUse(id)) {
      throw new ConflictException(
        `User with id ${id} owns locations, resources, holds or bookings, so it cannot be deleted; set isActive to false instead`,
      );
    }

    const res = (await this.usersRepo.delete(id)).affected;
    if (res != null && res > 0) {
      return `User deleted with id ${id}`;
    } else {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  // true when the user owns a location, resource, hold or booking
  private async isUserInUse(id: number): Promise<boolean> {
    const manager = this.usersRepo.manager;
    return (
      (await manager.exists(Locations, {
        where: { createdBy: { id: id } },
        withDeleted: true,
      })) ||
      (await manager.exists(Resources, {
        where: { organizer: { id: id } },
        withDeleted: true,
      })) ||
      (await manager.exists(SeatHolds, { where: { user: { id: id } } })) ||
      (await manager.exists(Bookings, { where: { user: { id: id } } }))
    );
  }
}