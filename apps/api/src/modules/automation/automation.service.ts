import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PresetRule } from './entities/preset-rule.entity';
import { ReminderRule } from './entities/reminder-rule.entity';
import { LogsService } from '../logs/logs.service';
import { LogType } from '../logs/entities/log-entry.entity';

@Injectable()
export class AutomationService {
  constructor(
    @InjectRepository(PresetRule)
    private readonly presetRepo: Repository<PresetRule>,
    @InjectRepository(ReminderRule)
    private readonly reminderRepo: Repository<ReminderRule>,
    private readonly logsService: LogsService,
  ) {}

  findPresets(orgId: string) {
    return this.presetRepo.find({ where: { orgId } });
  }

  createPreset(orgId: string, data: Partial<PresetRule>) {
    return this.presetRepo.save(this.presetRepo.create({ ...data, orgId }));
  }

  findReminders(orgId: string) {
    return this.reminderRepo.find({ where: { orgId } });
  }

  createReminder(orgId: string, data: Partial<ReminderRule>) {
    return this.reminderRepo.save(this.reminderRepo.create({ ...data, orgId }));
  }

  // Daily at 06:00 — generate pending log entries from preset rules
  @Cron('0 6 * * *')
  async generateDailyForms() {
    const rules = await this.presetRepo.find();
    for (const rule of rules) {
      await this.logsService.create(rule.orgId, 'system', {
        type: rule.type as LogType,
        fields: rule.defaults || {},
        presetId: rule.id,
      });
    }
  }
}
