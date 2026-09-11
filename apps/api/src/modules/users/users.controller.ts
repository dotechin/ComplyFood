import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { IsEnum } from 'class-validator';

class UpdateRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@CurrentUser() user: any) {
    return this.usersService.findByOrg(user.orgId);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  updateRole(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, user.orgId, dto.role);
  }

  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
