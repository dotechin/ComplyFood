import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AutomationService } from './automation.service';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

class CreatePresetDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  schedule?: Record<string, any>;

  @IsOptional()
  @IsObject()
  defaults?: Record<string, any>;
}

class CreateReminderDto {
  @IsString()
  type: string;

  @IsString()
  cronExpression: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

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
  createPreset(@CurrentUser() user: any, @Body() body: CreatePresetDto) {
    return this.automationService.createPreset(user.orgId, body);
  }

  @Get('reminders')
  getReminders(@CurrentUser() user: any) {
    return this.automationService.findReminders(user.orgId);
  }

  @Post('reminders')
  @Roles(UserRole.ADMIN)
  createReminder(@CurrentUser() user: any, @Body() body: CreateReminderDto) {
    return this.automationService.createReminder(user.orgId, body);
  }

  @Get('reminders/due')
  getDueReminders(@CurrentUser() user: any) {
    return this.automationService.findDueReminders(user.orgId);
  }

  @Post('reminders/:id/acknowledge')
  acknowledgeReminder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.automationService.acknowledgeReminder(user.orgId, id);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.automationService.getDashboardSnapshot(user.orgId);
  }

  @Post('generate')
  @Roles(UserRole.ADMIN)
  generate(@CurrentUser() user: any) {
    return this.automationService.generateDailyFormsForOrg(user.orgId);
  }
}
