import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { LogsModule } from '../logs/logs.module';
import { OverridesModule } from '../overrides/overrides.module';

@Module({
  imports: [LogsModule, OverridesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
