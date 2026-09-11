import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { IsString, IsOptional } from 'class-validator';

class OrgDto {
  @IsString() name: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() category?: string;
}

class LocationDto {
  @IsString() name: string;
  @IsOptional() @IsString() address?: string;
}

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('me')
  getMyOrg(@CurrentUser() user: any) {
    return this.orgsService.findOrgById(user.orgId);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: OrgDto) {
    return this.orgsService.createOrg(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: Partial<OrgDto>) {
    return this.orgsService.updateOrg(id, user.orgId, dto);
  }

  @Get(':id/locations')
  getLocations(@CurrentUser() user: any, @Param('id') id: string) {
    if (id !== user.orgId) {
      throw new NotFoundException('Organization not found');
    }
    return this.orgsService.findLocationsByOrg(id);
  }

  @Post(':id/locations')
  @Roles(UserRole.ADMIN)
  addLocation(@CurrentUser() user: any, @Param('id') orgId: string, @Body() dto: LocationDto) {
    return this.orgsService.createLocation(orgId, user.orgId, dto);
  }

  @Delete(':orgId/locations/:locId')
  @Roles(UserRole.ADMIN)
  removeLocation(@CurrentUser() user: any, @Param('orgId') orgId: string, @Param('locId') locId: string) {
    if (orgId !== user.orgId) {
      throw new NotFoundException('Organization not found');
    }
    return this.orgsService.deleteLocation(locId, orgId);
  }
}
