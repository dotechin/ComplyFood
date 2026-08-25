import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OverrideRecord } from './entities/override-record.entity';
import { OverridesService } from './overrides.service';
import { OverridesController } from './overrides.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([OverrideRecord]), LogsModule],
  providers: [OverridesService],
  controllers: [OverridesController],
  exports: [OverridesService],
})
export class OverridesModule {}
