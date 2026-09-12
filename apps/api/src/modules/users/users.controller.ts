import { Controller, Get, Patch, Param, Body, UseGuards, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { User } from './entities/user.entity';

class UpdateRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      createdAt: user.createdAt,
    };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(@CurrentUser() user: any) {
    const users = await this.usersService.findByOrg(user.orgId);
    return users.map((member) => this.toPublicUser(member));
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@CurrentUser() user: any, @Body() dto: CreateUserDto, @Req() request: Request) {
    request.body.password = '[REDACTED]';
    const createdUser = await this.usersService.create(dto.email, dto.password, dto.role, user.orgId);
    return this.toPublicUser(createdUser);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  async updateRole(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const updatedUser = await this.usersService.updateRole(id, user.orgId, dto.role);
    return this.toPublicUser(updatedUser);
  }

  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
