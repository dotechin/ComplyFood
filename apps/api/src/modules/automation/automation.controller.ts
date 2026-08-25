import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AutomationService } from './automation.service';

@Controller('automation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get('presets')
  getPresets(@CurrentUser() user: any) {
    return this.automationService.findPresets(user.orgId);
  }

  @Post('presets')
  @Roles(UserRole.ADMIN)
  createPreset(@CurrentUser() user: any, @Body() body: any) {
    return this.automationService.createPreset(user.orgId, body);
  }

  @Get('reminders')
  getReminders(@CurrentUser() user: any) {
    return this.automationService.findReminders(user.orgId);
  }

  @Post('reminders')
  @Roles(UserRole.ADMIN)
  createReminder(@CurrentUser() user: any, @Body() body: any) {
    return this.automationService.createReminder(user.orgId, body);
  }
}
