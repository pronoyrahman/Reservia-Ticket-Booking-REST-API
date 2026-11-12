import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Users } from './entities/users.entity.js';
import { CreateUserDto } from './dtos/create-user.dto.js';
import { UpdateUserDto } from './dtos/update-user.dto.js';
import { GetUsersQueryDto } from './dtos/get-users-query.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
    private readonly configService: ConfigService,
  ) {}

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

  async replaceUser(id: number, user: UpdateUserDto): Promise<Users> {
    return await this.updateUser(id, user);
  }

  async updateUser(id: number, user: UpdateUserDto): Promise<Users> {
    await this.getUserById(id);
    if (user.email) {
      await this.checkEmailFree(user.email, id);
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
    const res = (await this.usersRepo.delete(id)).affected;
    if (res != null && res > 0) {
      return `User deleted with id ${id}`;
    } else {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }
}