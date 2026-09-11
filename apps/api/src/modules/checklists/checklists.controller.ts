import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChecklistsService } from './checklists.service';

@Controller('checklists')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChecklistsController {
  constructor(private readonly service: ChecklistsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user.orgId, body);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.orgId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(id, user.orgId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(id, user.orgId, body);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(id, user.orgId);
  }

  @Post(':id/generate')
  generate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.generateLog(id, user.orgId, user.id);
  }
}
