import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OverridesService, CreateOverrideDto } from './overrides.service';

@Controller('overrides')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OverridesController {
  constructor(private readonly overridesService: OverridesService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOverrideDto) {
    return this.overridesService.create(user.id, user.orgId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.overridesService.findByOrg(user.orgId);
  }

  @Get('log/:logEntryId')
  findByLog(@CurrentUser() user: any, @Param('logEntryId') logEntryId: string) {
    return this.overridesService.findByLogEntry(logEntryId, user.orgId);
  }
}
