import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresetRule } from './entities/preset-rule.entity';
import { ReminderRule } from './entities/reminder-rule.entity';
import { ReminderEvent } from './entities/reminder-event.entity';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([PresetRule, ReminderRule, ReminderEvent]), LogsModule],
  providers: [AutomationService],
  controllers: [AutomationController],
  exports: [AutomationService],
})
export class AutomationModule {}
