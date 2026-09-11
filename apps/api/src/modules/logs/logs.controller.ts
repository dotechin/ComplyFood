import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LogStatus, LogType } from './entities/log-entry.entity';
import { LogsService } from './logs.service';

function parseDateBoundary(value: string, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Dates must use YYYY-MM-DD format');
  }

  const date = new Date(`${value}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date value');
  }

  return date;
}

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
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
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
    return this.logsService.update(id, user.orgId, dto);
  }

  @Patch(':id/confirm')
  confirm(@CurrentUser() user: any, @Param('id') id: string) {
    return this.logsService.confirm(id, user.orgId, user.id);
  }
}
