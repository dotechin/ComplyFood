import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { PresetRule } from './entities/preset-rule.entity';
import { ReminderRule } from './entities/reminder-rule.entity';
import { ReminderEvent } from './entities/reminder-event.entity';
import { LogsService } from '../logs/logs.service';
import { LogDataClassification, LogEntry, LogStatus, LogType } from '../logs/entities/log-entry.entity';
import { SupermodeSchedule } from './entities/supermode-schedule.entity';
import { dueRunDates, followingWeekDates, localDateTime, validateTimeZone } from './supermode-schedule-time';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(PresetRule)
    private readonly presetRepo: Repository<PresetRule>,
    @InjectRepository(ReminderRule)
    private readonly reminderRepo: Repository<ReminderRule>,
    @InjectRepository(ReminderEvent)
    private readonly reminderEventRepo: Repository<ReminderEvent>,
    @InjectRepository(SupermodeSchedule)
    private readonly supermodeScheduleRepo: Repository<SupermodeSchedule>,
    private readonly logsService: LogsService,
  ) {}

  getSupermodeSchedule(orgId: string) {
    return this.supermodeScheduleRepo.findOne({ where: { orgId } });
  }

  async getDailyCheckDate(orgId: string) {
    const schedule = await this.supermodeScheduleRepo.findOne({ where: { orgId } });
    const timezone = schedule?.timezone ?? 'UTC';
    return { date: localDateTime(new Date(), timezone).date, timezone };
  }

  async getTemperatureSettings(orgId: string) {
    const schedule = await this.supermodeScheduleRepo.findOne({ where: { orgId } });
    return {
      units: schedule?.appliances.map((appliance) => ({
        value: appliance.name,
        label: appliance.name,
        category: appliance.category,
      })) ?? [],
      openingDays: schedule?.openingDays ?? [0, 1, 2, 3, 4, 5, 6],
    };
  }

  async saveSupermodeSchedule(
    orgId: string,
    data: {
      enabled: boolean;
      cadence: 'daily' | 'weekly';
      runTime: string;
      timezone: string;
      weeklyRunDay?: number;
      openingDays: number[];
      appliances: Array<{ name: string; category: 'fridge' | 'freezer'; limit: number }>;
    },
  ) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.runTime)) {
      throw new BadRequestException('Choose a valid 24-hour schedule time');
    }
    if (!validateTimeZone(data.timezone)) throw new BadRequestException('Choose a valid time zone');
    if (data.cadence === 'weekly' && (!Number.isInteger(data.weeklyRunDay) || data.weeklyRunDay! < 0 || data.weeklyRunDay! > 6)) {
      throw new BadRequestException('Choose a weekly run day');
    }
    if (data.cadence === 'daily' && data.weeklyRunDay !== undefined) {
      throw new BadRequestException('Daily schedules cannot have a weekly run day');
    }
    if (!data.openingDays.length || data.openingDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      throw new BadRequestException('Select at least one valid opening day');
    }
    if (!data.appliances.length || data.appliances.length > 30) {
      throw new BadRequestException('Configure between 1 and 30 appliances');
    }
    const names = new Set<string>();
    for (const appliance of data.appliances) {
      const name = appliance.name.trim();
      if (!name || name.length > 80 || names.has(name.toLocaleLowerCase())) {
        throw new BadRequestException('Appliance names must be unique and no longer than 80 characters');
      }
      if (!Number.isFinite(appliance.limit) || appliance.limit < -100 || appliance.limit > 200) {
        throw new BadRequestException(`Enter a valid temperature limit for ${name}`);
      }
      names.add(name.toLocaleLowerCase());
    }

    const existing = await this.supermodeScheduleRepo.findOne({ where: { orgId } });
    const schedule = existing ?? this.supermodeScheduleRepo.create({ orgId });
    Object.assign(schedule, {
      ...data,
      weeklyRunDay: data.cadence === 'weekly' ? data.weeklyRunDay : null,
      openingDays: [...new Set(data.openingDays)],
      appliances: data.appliances.map((appliance) => ({ ...appliance, name: appliance.name.trim() })),
    });
    return this.supermodeScheduleRepo.save(schedule);
  }

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

  @Cron('* * * * *')
  async processSupermodeSchedules() {
    const schedules = await this.supermodeScheduleRepo.find({ where: { enabled: true } });
    for (const schedule of schedules) {
      try {
        await this.processSupermodeSchedule(schedule.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.supermodeScheduleRepo.update(schedule.id, { lastError: message });
        this.logger.error(`Unable to prepare daily checks for organization ${schedule.orgId}: ${message}`);
      }
    }
  }

  private async processSupermodeSchedule(id: string) {
    await this.supermodeScheduleRepo.manager.transaction(async (manager) => {
      const schedules = manager.getRepository(SupermodeSchedule);
      const schedule = await schedules.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!schedule?.enabled) return;

      const now = new Date();
      const runDates = dueRunDates(
        schedule.cadence,
        schedule.runTime,
        schedule.weeklyRunDay,
        schedule.lastRunLocalDate,
        now,
        schedule.timezone,
      );
      const logs = manager.getRepository(LogEntry);
      for (const runDate of runDates) {
        const checkDates = schedule.cadence === 'daily' ? [runDate] : followingWeekDates(runDate);
        const entries: LogEntry[] = [];
        for (const date of checkDates) {
          const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
          if (!schedule.openingDays.includes(weekday)) continue;
          for (const appliance of schedule.appliances) {
            const key = `${schedule.id}:${date}:${appliance.name.toLocaleLowerCase()}`;
            entries.push(logs.create({
              orgId: schedule.orgId,
              locationId: null,
              type: LogType.TEMPERATURE,
              fields: {
                scheduledDate: date,
                'Workstation / unit': appliance.name,
                category: appliance.category,
                limit: appliance.limit,
                scheduleCadence: schedule.cadence,
                source: 'daily-schedule',
              },
              dataClassification: LogDataClassification.REAL,
              status: LogStatus.PENDING,
              submittedBy: null,
              submittedAt: null,
              presetId: null,
              occurredAt: new Date(`${date}T00:00:00.000Z`),
              measuredAt: null,
              recordOrigin: null,
              sourceDocumentId: null,
              sourcePage: null,
              scheduleKey: key,
              importKey: null,
              isException: false,
              exceptionReason: null,
              exceptionBy: null,
              exceptionAt: null,
            }));
          }
        }
        if (entries.length) {
          const existing = await logs.find({
            where: { orgId: schedule.orgId, scheduleKey: In(entries.map((entry) => entry.scheduleKey)) },
          });
          const existingKeys = new Set(existing.map((entry) => entry.scheduleKey));
          const missing = entries.filter((entry) => !existingKeys.has(entry.scheduleKey));
          if (missing.length) await logs.save(missing);
        }
        schedule.lastRunLocalDate = runDate;
        schedule.lastRunAt = now;
      }
      schedule.lastError = null;
      await schedules.save(schedule);
    });
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
