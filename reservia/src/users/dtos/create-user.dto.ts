import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum.js';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,20}$/, {
    message:
      'password should have at least one lowercase, one uppercase, one number, one special char and length should be between 8 to 20 char',
  })
  password: string;

  @IsOptional()
  @IsMobilePhone('bn-BD')
  phoneNumber?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'role must be admin, organizer or customer' })
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}