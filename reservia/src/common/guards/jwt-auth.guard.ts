
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  private isPublic(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic === true;
  }

  canActivate(context: ExecutionContext) {
    if (this.isPublic(context)) {
      const request = context.switchToHttp().getRequest();
      // public route without a token: let the guest in
      if (!request.headers.authorization) {
        return true;
      }
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (this.isPublic(context)) {
      // public route with a token: use it if valid, otherwise treat as guest
      return user || null;
    }
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}