import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresetRule } from './entities/preset-rule.entity';
import { ReminderRule } from './entities/reminder-rule.entity';
import { ReminderEvent } from './entities/reminder-event.entity';
import { SupermodeSchedule } from './entities/supermode-schedule.entity';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { LogsModule } from '../logs/logs.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([PresetRule, ReminderRule, ReminderEvent, SupermodeSchedule]), LogsModule, UsersModule],
  providers: [AutomationService],
  controllers: [AutomationController],
  exports: [AutomationService],
})
export class AutomationModule {}
