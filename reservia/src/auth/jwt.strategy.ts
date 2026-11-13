
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service.js';
import { Users } from '../users/entities/users.entity.js';

export type JwtPayload = {
  id: number;
  email: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  
  async validate(payloads: JwtPayload): Promise<JwtPayload> {
    let user: Users;
    try {
      user = await this.usersService.getUserById(payloads.id);
    } catch {
      throw new UnauthorizedException('This account no longer exists');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('This account is deactivated');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}