import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsIn, IsISO8601, IsInt, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { LogStatus, LogType } from './entities/log-entry.entity';
import { parseDateBoundary } from '../../common/utils/date-boundary';
import { LogsService } from './logs.service';
import { UsersService } from '../users/users.service';
import { SupermodePinDto } from '../users/users.controller';

class ResetLogsDto extends SupermodePinDto {
  @IsIn(['generated', 'all'])
  scope: 'generated' | 'all';
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

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'occurredDate must use YYYY-MM-DD format' })
  occurredDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'measuredDate must use YYYY-MM-DD format' })
  measuredDate?: string;
}

class BackfillLogDto {
  @IsEnum(LogType)
  type: LogType;

  @IsObject()
  fields: Record<string, any>;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsISO8601()
  createdAt: string;

  @IsOptional()
  @IsEnum(LogStatus)
  status?: LogStatus;
}

class HistoricalTemperatureRecordDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsIn([
    'Banco Refrigerato Bar (n.1)',
    'Banco Refrigerato Bar (n.2)',
    'Banco Refrigerato Bar (n.3)',
    'Pozzetto Freezer Cucina (n.4)',
  ])
  unit: string;

  @IsIn(['C', 'NC'])
  outcome: 'C' | 'NC';

  @IsInt()
  @Min(1)
  page: number;
}

class HistoricalTemperatureImportDto {
  @IsUUID()
  sourceDocumentId: string;

  @IsArray()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => HistoricalTemperatureRecordDto)
  records: HistoricalTemperatureRecordDto[];
}

class HistoricalCleaningRecordDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period: string;

  @IsIn([1, 2, 3, 4, 5])
  week: number;

  @IsInt()
  @Min(1)
  page: number;

  @IsArray()
  @ArrayMinSize(11)
  @ArrayMaxSize(11)
  @IsIn(['C', 'A', 'NC'], { each: true })
  outcomes: Array<'C' | 'A' | 'NC'>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  correctiveAction?: string;
}

class HistoricalCleaningImportDto {
  @IsUUID()
  sourceDocumentId: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => HistoricalCleaningRecordDto)
  records: HistoricalCleaningRecordDto[];
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
  constructor(
    private readonly logsService: LogsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateLogDto) {
    return this.logsService.create(user.orgId, user.id, dto);
  }

  @Post('backfill')
  @Roles(UserRole.ADMIN)
  backfill(@CurrentUser() user: any, @Body() dto: BackfillLogDto) {
    return this.logsService.backfill(user.orgId, user.id, {
      type: dto.type,
      fields: dto.fields,
      locationId: dto.locationId ?? null,
      createdAt: new Date(dto.createdAt),
      status: dto.status,
    });
  }

  @Post('historical-temperature-import')
  @Roles(UserRole.ADMIN)
  importHistoricalTemperatures(@CurrentUser() user: any, @Body() dto: HistoricalTemperatureImportDto) {
    return this.logsService.importHistoricalTemperatures(
      user.orgId,
      user.id,
      dto.sourceDocumentId,
      dto.records,
    );
  }

  @Post('historical-cleaning-import')
  @Roles(UserRole.ADMIN)
  importHistoricalCleaning(@CurrentUser() user: any, @Body() dto: HistoricalCleaningImportDto) {
    return this.logsService.importHistoricalCleaning(
      user.orgId,
      user.id,
      dto.sourceDocumentId,
      dto.records,
    );
  }

  @Post('reset')
  @HttpCode(200)
  @Roles(UserRole.ADMIN)
  async reset(@CurrentUser() user: any, @Body() dto: ResetLogsDto, @Req() request: Request) {
    request.body.pin = '[REDACTED]';
    await this.usersService.verifySupermodePin(user.id, dto.pin);
    return this.logsService.reset(user.orgId, dto.scope);
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
      occurredAt: dto.occurredDate ? new Date(`${dto.occurredDate}T00:00:00.000Z`) : undefined,
      measuredAt: dto.measuredDate ? new Date(`${dto.measuredDate}T00:00:00.000Z`) : undefined,
    });
  }

  @Patch(':id/confirm')
  confirm(@CurrentUser() user: any, @Param('id') id: string) {
    return this.logsService.confirm(id, user.orgId, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.logsService.remove(id, user.orgId);
  }

  @Post('temperature/ocr-suggestion')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
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
