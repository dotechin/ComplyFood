import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { LogType } from '../logs/entities/log-entry.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: any,
    @Query('type') type?: LogType,
    @Query('locationId') locationId?: string,
  ) {
    return this.reportsService.getComplianceSummary(user.orgId, type, locationId);
  }

  @Get('export/csv')
  async exportCsv(
    @CurrentUser() user: any,
    @Query('type') type: LogType,
    @Res() res: Response,
  ) {
    const csv = await this.reportsService.generateCsv(user.orgId, type);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="compliance-report.csv"');
    res.send(csv);
  }
}
