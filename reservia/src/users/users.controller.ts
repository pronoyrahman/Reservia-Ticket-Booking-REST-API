import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dtos/create-user.dto.js';
import { UpdateUserDto } from './dtos/update-user.dto.js';
import { Users } from './entities/users.entity.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<Users | null> {
    return await this.usersService.getUserById(id);
  }

  @Get()
  async getAllUsers(): Promise<Users[]> {
    return await this.usersService.getAllUsers();
  }

  @Post('create-user')
  async createUser(@Body() user: CreateUserDto): Promise<Users> {
    return await this.usersService.createUser(user);
  }

  @Put('updateUserFully/:id')
  async updateUserFully(
    @Param('id') id: string,
    @Body() user: UpdateUserDto,
  ): Promise<Users | string> {
    return await this.usersService.replaceUser(id, user);
  }

  @Patch('updateUserPartially/:id')
  async updateUserPartially(
    @Param('id') id: string,
    @Body() user: UpdateUserDto,
  ): Promise<Users | string> {
    return await this.usersService.updateUser(id, user);
  }

  @Delete(':id')
  async deleteUserById(@Param('id') id: string): Promise<string> {
    return await this.usersService.deleteUser(id);
  }
}