import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsEnum, IsISO8601, IsObject, IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { LogStatus, LogType } from './entities/log-entry.entity';
import { parseDateBoundary } from '../../common/utils/date-boundary';
import { LogsService } from './logs.service';

class CreateLogDto {
  @IsEnum(LogType)
  type: LogType;

  @IsObject()
  fields: Record<string, any>;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  presetId?: string;
}

class UpdateLogDto {
  @IsOptional()
  @IsObject()
  fields?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'occurredDate must use YYYY-MM-DD format' })
  occurredDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'measuredDate must use YYYY-MM-DD format' })
  measuredDate?: string;
}

class FindLogsQueryDto {
  @IsOptional()
  @IsEnum(LogType)
  type?: LogType;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsEnum(LogStatus)
  status?: LogStatus;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom must use YYYY-MM-DD format' })
  dateFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo must use YYYY-MM-DD format' })
  dateTo?: string;
}

class ApplyExceptionDto {
  @IsString()
  @MinLength(3)
  reason: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @IsISO8601()
  measuredAt?: string;

  @IsOptional()
  @IsEnum(LogStatus)
  unlockToStatus?: LogStatus;
}

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateLogDto) {
    return this.logsService.create(user.orgId, user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: FindLogsQueryDto) {
    return this.logsService.findAll(
      user.orgId,
      query.type,
      query.locationId,
      query.status,
      query.dateFrom ? parseDateBoundary(query.dateFrom) : undefined,
      query.dateTo ? parseDateBoundary(query.dateTo, true) : undefined,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.logsService.findOne(id, user.orgId);
  }

  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateLogDto) {
    return this.logsService.update(id, user.orgId, {
      fields: dto.fields,
      locationId: dto.locationId,
      occurredAt: dto.occurredDate ? parseDateBoundary(dto.occurredDate) : undefined,
      measuredAt: dto.measuredDate ? parseDateBoundary(dto.measuredDate) : undefined,
    });
  }

  @Patch(':id/confirm')
  confirm(@CurrentUser() user: any, @Param('id') id: string) {
    return this.logsService.confirm(id, user.orgId, user.id);
  }

  @Post('temperature/ocr-suggestion')
  @UseInterceptors(FileInterceptor('file'))
  getTemperatureSuggestion(@UploadedFile() file: any) {
    if (!file) {
      return { extractedValue: null, confidence: 0, source: 'none' };
    }
    return this.logsService.suggestTemperatureFromCapture(String(file.originalname || 'capture'));
  }

  @Patch(':id/exception')
  @Roles(UserRole.ADMIN)
  applyException(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: ApplyExceptionDto) {
    return this.logsService.applyException(id, user.orgId, user.id, dto.reason, {
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      measuredAt: dto.measuredAt ? new Date(dto.measuredAt) : undefined,
      unlockToStatus: dto.unlockToStatus,
    });
  }
}
