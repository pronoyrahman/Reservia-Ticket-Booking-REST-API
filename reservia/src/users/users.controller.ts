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
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dtos/create-user.dto.js';
import { UpdateUserDto } from './dtos/update-user.dto.js';
import { GetUsersQueryDto } from './dtos/get-users-query.dto.js';
import { ReplaceUserDto } from './dtos/replace-user.dto.js';
import { Users } from './entities/users.entity.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import type { JwtPayload } from '../auth/jwt.strategy.js';
@Controller('users')
@Roles(Role.Admin)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create-user')
  async createUser(@Body() user: CreateUserDto): Promise<Users> {
    return await this.usersService.createUser(user);
  }

  @Get()
  async getAllUsers(@Query() query: GetUsersQueryDto) {
    return await this.usersService.getAllUsers(query);
  }

  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<Users> {
    return await this.usersService.getUserById(id);
  }

   @Put('updateUserFully/:id')
    async updateUserFully(
    @Param('id', ParseIntPipe) id: number,
    @Body() user: ReplaceUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Users> {
    return await this.usersService.replaceUser(id, user, currentUser.id);
  }

  @Patch('updateUserPartially/:id')
  async updateUserPartially(
    @Param('id', ParseIntPipe) id: number,
    @Body() user: UpdateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<Users> {
    return await this.usersService.updateUser(id, user, currentUser.id);
  }

  @Delete(':id')
  async deleteUserById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<string> {
    return await this.usersService.deleteUser(id, currentUser.id);
  }
}