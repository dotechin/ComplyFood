import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
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
  update(@Param('id') id: string, @Body() dto: Partial<OrgDto>) {
    return this.orgsService.updateOrg(id, dto);
  }

  @Get(':id/locations')
  getLocations(@Param('id') id: string) {
    return this.orgsService.findLocationsByOrg(id);
  }

  @Post(':id/locations')
  @Roles(UserRole.ADMIN)
  addLocation(@Param('id') orgId: string, @Body() dto: LocationDto) {
    return this.orgsService.createLocation(orgId, dto);
  }

  @Delete(':orgId/locations/:locId')
  @Roles(UserRole.ADMIN)
  removeLocation(@Param('locId') locId: string) {
    return this.orgsService.deleteLocation(locId);
  }
}
