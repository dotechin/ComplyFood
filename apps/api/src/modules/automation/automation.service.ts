import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PresetRule } from './entities/preset-rule.entity';
import { ReminderRule } from './entities/reminder-rule.entity';
import { ReminderEvent } from './entities/reminder-event.entity';
import { LogsService } from '../logs/logs.service';
import { LogStatus, LogType } from '../logs/entities/log-entry.entity';

@Injectable()
export class AutomationService {
  constructor(
    @InjectRepository(PresetRule)
    private readonly presetRepo: Repository<PresetRule>,
    @InjectRepository(ReminderRule)
    private readonly reminderRepo: Repository<ReminderRule>,
    @InjectRepository(ReminderEvent)
    private readonly reminderEventRepo: Repository<ReminderEvent>,
    private readonly logsService: LogsService,
  ) {}

  findPresets(orgId: string) {
    return this.presetRepo.find({ where: { orgId }, order: { createdAt: 'DESC' } });
  }

  createPreset(orgId: string, data: Partial<PresetRule>) {
    return this.presetRepo.save(
      this.presetRepo.create({
        ...data,
        orgId,
        schedule: data.schedule ?? { active: true, weekdays: [1, 2, 3, 4, 5, 6, 0] },
      }),
    );
  }

  findReminders(orgId: string) {
    return this.reminderRepo.find({ where: { orgId }, order: { createdAt: 'DESC' } });
  }

  createReminder(orgId: string, data: Partial<ReminderRule>) {
    const type = String(data.type ?? '').trim();
    return this.reminderRepo.save(
      this.reminderRepo.create({
        ...data,
        orgId,
        type,
        message: data.message?.trim() || `Complete ${type} tasks`,
        isActive: data.isActive ?? true,
      }),
    );
  }

  async findDueReminders(orgId: string) {
    return this.reminderEventRepo.find({
      where: { orgId, acknowledgedAt: IsNull() },
      order: { scheduledFor: 'ASC' },
    });
  }

  async acknowledgeReminder(orgId: string, id: string) {
    const reminder = await this.reminderEventRepo.findOne({ where: { id, orgId } });
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }
    reminder.acknowledgedAt = new Date();
    return this.reminderEventRepo.save(reminder);
  }

  async getDashboardSnapshot(orgId: string) {
    const [pendingLogs, reminders, presets, reminderRules] = await Promise.all([
      this.logsService.findAll(orgId, undefined, undefined, LogStatus.PENDING),
      this.findDueReminders(orgId),
      this.findPresets(orgId),
      this.findReminders(orgId),
    ]);

    return {
      pendingLogs,
      dueReminders: reminders,
      generatedToday: pendingLogs.filter((log) => Boolean(log.presetId)).length,
      activePresetCount: presets.filter((preset) => preset.schedule?.active !== false).length,
      activeReminderCount: reminderRules.filter((rule) => rule.isActive !== false).length,
    };
  }

  // Daily at 06:00 — generate pending log entries from preset rules
  @Cron('0 6 * * *')
  async generateDailyForms() {
    const rules = await this.presetRepo.find();
    await Promise.all(rules.map((rule) => this.generateDailyFormForRule(rule)));
  }

  @Cron('* * * * *')
  async processDueReminders() {
    const now = new Date();
    const rules = await this.reminderRepo.find({ where: { isActive: true } });

    await Promise.all(
      rules.map(async (rule) => {
        if (!this.matchesCronExpression(rule.cronExpression, now)) {
          return;
        }

        const scheduledFor = new Date(now);
        scheduledFor.setSeconds(0, 0);

        const existing = await this.reminderEventRepo.findOne({
          where: {
            orgId: rule.orgId,
            reminderRuleId: rule.id,
            scheduledFor,
          },
        });

        if (existing) {
          return;
        }

        await this.reminderEventRepo.save(
          this.reminderEventRepo.create({
            orgId: rule.orgId,
            reminderRuleId: rule.id,
            type: rule.type,
            message: rule.message || this.buildReminderMessage(rule.type),
            scheduledFor,
            acknowledgedAt: null,
          }),
        );

        rule.lastTriggeredAt = scheduledFor;
        await this.reminderRepo.save(rule);
      }),
    );
  }

  async generateDailyFormsForOrg(orgId: string) {
    const rules = await this.presetRepo.find({ where: { orgId } });
    const created = await Promise.all(rules.map((rule) => this.generateDailyFormForRule(rule)));
    return created.filter(Boolean);
  }

  private async generateDailyFormForRule(rule: PresetRule) {
    const now = new Date();
    if (!this.shouldGenerateForToday(rule, now)) {
      return null;
    }

    const exists = await this.logsService.hasPresetEntryForDate(rule.orgId, rule.id, now);
    if (exists) {
      return null;
    }

    return this.logsService.create(rule.orgId, null, {
      type: rule.type as LogType,
      fields: {
        ...(rule.defaults || {}),
        presetSchedule: rule.schedule ?? null,
      },
      presetId: rule.id,
    });
  }

  private shouldGenerateForToday(rule: PresetRule, date: Date) {
    const schedule = rule.schedule ?? {};
    if (schedule.active === false) {
      return false;
    }

    const weekdays = Array.isArray(schedule.weekdays) ? schedule.weekdays : null;
    if (weekdays && weekdays.length > 0 && !weekdays.includes(date.getDay())) {
      return false;
    }

    return true;
  }

  private matchesCronExpression(expression: string, date: Date) {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      return false;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    return (
      this.matchesCronPart(minute, date.getMinutes()) &&
      this.matchesCronPart(hour, date.getHours()) &&
      this.matchesCronPart(dayOfMonth, date.getDate()) &&
      this.matchesCronPart(month, date.getMonth() + 1) &&
      this.matchesCronPart(dayOfWeek, date.getDay(), true)
    );
  }

  private matchesCronPart(part: string, value: number, sundayAware = false) {
    if (part === '*') {
      return true;
    }

    return part.split(',').some((entry) => {
      const normalized = sundayAware && entry === '7' ? '0' : entry;
      const parsed = Number(normalized);
      return Number.isInteger(parsed) && parsed === value;
    });
  }

  private buildReminderMessage(type: string) {
    return `Complete ${type} tasks`;
  }
}
