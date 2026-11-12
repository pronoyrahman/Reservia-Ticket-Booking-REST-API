import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Users } from './entities/users.entity.js';
import { CreateUserDto } from './dtos/create-user.dto.js';
import { UpdateUserDto } from './dtos/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
  ) {}

  async createUser(user: CreateUserDto): Promise<Users> {
    console.log(user);
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const userEntity = this.usersRepo.create({
        email: user.email,
        password_hash: hashedPassword,
        name: user.name,
        phone_number: user.phone_number,
        role: user.role || 'customer',
      });
      return await this.usersRepo.save(userEntity);
    } catch {
      throw new BadRequestException('Failed to create user');
    }
  }

  async getAllUsers(): Promise<Users[]> {
    return await this.usersRepo.find({
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
        role: true,
        is_active: true,
        created_at: true,
      },
    });
  }

  async getUserById(id: string): Promise<Users | null> {
    return await this.usersRepo.findOne({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        phone_number: true,
        role: true,
        is_active: true,
        created_at: true,
      },
    });
  }

  async deleteUser(id: string): Promise<string> {
    const res = (await this.usersRepo.delete(parseInt(id))).affected;
    if (res && res > 0) {
      return `User deleted with id ${id}`;
    } else {
      throw new BadRequestException('User not found');
    }
  }

  async replaceUser(id: string, user: UpdateUserDto): Promise<string> {
    try {
      const updateData: any = {
        email: user.email,
        name: user.name,
        phone_number: user.phone_number,
        role: user.role,
      };
      if (user.password) {
        updateData.password_hash = await bcrypt.hash(user.password, 10);
      }
      const res = (await this.usersRepo.update(parseInt(id), updateData))
        .affected;
      if (res && res > 0) {
        return `User updated with id ${id}`;
      } else {
        return `User with id ${id} not found`;
      }
    } catch {
      throw new BadRequestException('User not found');
    }
  }

  async updateUser(id: string, user: UpdateUserDto): Promise<string> {
    try {
      const updateData: any = {};
      if (user.email) updateData.email = user.email;
      if (user.name) updateData.name = user.name;
      if (user.phone_number) updateData.phone_number = user.phone_number;
      if (user.role) updateData.role = user.role;
      if (user.password) {
        updateData.password_hash = await bcrypt.hash(user.password, 10);
      }
      const res = (await this.usersRepo.update(parseInt(id), updateData))
        .affected;
      if (res && res > 0) {
        return `User updated with id ${id}`;
      } else {
        return `User with id ${id} not found`;
      }
    } catch {
      throw new BadRequestException('User not found');
    }
  }
}