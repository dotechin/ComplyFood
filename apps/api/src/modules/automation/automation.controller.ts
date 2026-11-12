import { Controller, Get, Post, Body, UseGuards, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AutomationService } from './automation.service';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SupermodePinDto } from '../users/users.controller';
import { UsersService } from '../users/users.service';

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

class ApplianceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsIn(['fridge', 'freezer'])
  category: 'fridge' | 'freezer';

  @Type(() => Number)
  @IsNumber()
  @Min(-100)
  @Max(200)
  limit: number;
}

class SupermodeScheduleDto extends SupermodePinDto {
  @IsBoolean()
  enabled: boolean;

  @IsIn(['daily', 'weekly'])
  cadence: 'daily' | 'weekly';

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  runTime: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  timezone: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  weeklyRunDay?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  openingDays: number[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ApplianceDto)
  appliances: ApplianceDto[];
}

@Controller('automation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly usersService: UsersService,
  ) {}

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

  @Get('supermode-schedule')
  @Roles(UserRole.ADMIN)
  getSupermodeSchedule(@CurrentUser() user: any) {
    return this.automationService.getSupermodeSchedule(user.orgId);
  }

  @Get('daily-check-date')
  getDailyCheckDate(@CurrentUser() user: any) {
    return this.automationService.getDailyCheckDate(user.orgId);
  }

  @Get('temperature-settings')
  getTemperatureSettings(@CurrentUser() user: any) {
    return this.automationService.getTemperatureSettings(user.orgId);
  }

  @Post('supermode-schedule')
  @Roles(UserRole.ADMIN)
  async saveSupermodeSchedule(
    @CurrentUser() user: any,
    @Body() dto: SupermodeScheduleDto,
    @Req() request: Request,
  ) {
    request.body.pin = '[REDACTED]';
    await this.usersService.verifySupermodePin(user.id, dto.pin);
    const { pin: _pin, ...schedule } = dto;
    return this.automationService.saveSupermodeSchedule(user.orgId, schedule);
  }
}
