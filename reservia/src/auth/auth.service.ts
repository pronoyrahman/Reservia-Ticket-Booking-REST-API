


import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { Users } from '../users/entities/users.entity.js';
import { Role } from '../common/enums/role.enum.js';
import { RegisterDto } from './dtos/register.dto.js';
import { LoginDto } from './dtos/login.dto.js';
import { JwtPayload } from './jwt.strategy.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(user: RegisterDto): Promise<Users> {
    return await this.usersService.createUser({
      name: user.name,
      email: user.email,
      password: user.password,
      phoneNumber: user.phoneNumber,
      role: Role.Customer,
    });
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.usersService.getUserByEmailWithPassword(
      loginDto.email,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passMatch = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!passMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account is deactivated');
    }

    const payloads: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payloads);
    return { accessToken: accessToken };
  }

  async getProfile(id: number): Promise<Users> {
    return await this.usersService.getUserById(id);
  }
}