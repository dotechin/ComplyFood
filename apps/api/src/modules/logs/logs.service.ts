import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { LogEntry, LogStatus, LogType } from './entities/log-entry.entity';

interface CreateLogInput {
  type: LogType;
  fields: Record<string, any>;
  locationId?: string | null;
  presetId?: string | null;
}

interface UpdateLogInput {
  fields?: Record<string, any>;
  locationId?: string | null;
  status?: LogStatus;
}

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(LogEntry)
    private readonly repo: Repository<LogEntry>,
  ) {}

  create(orgId: string, userId: string | null, data: CreateLogInput) {
    return this.repo.save(
      this.repo.create({
        orgId,
        locationId: data.locationId ?? null,
        type: data.type,
        fields: data.fields ?? {},
        presetId: data.presetId ?? null,
        submittedBy: null,
        submittedAt: null,
        status: LogStatus.PENDING,
      }),
    );
  }

  async findAll(
    orgId: string,
    type?: LogType,
    locationId?: string,
    status?: LogStatus,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<LogEntry[]> {
    const where: Record<string, any> = { orgId };
    if (type) where.type = type;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = Between(
        dateFrom ?? new Date('2000-01-01T00:00:00.000Z'),
        dateTo ?? new Date('2999-12-31T23:59:59.999Z'),
      );
    }
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, orgId: string): Promise<LogEntry> {
    const entry = await this.repo.findOne({ where: { id, orgId } });
    if (!entry) throw new NotFoundException('Log entry not found');
    return entry;
  }

  async update(id: string, orgId: string, data: UpdateLogInput): Promise<LogEntry> {
    const entry = await this.findOne(id, orgId);
    if (data.fields) entry.fields = data.fields;
    if (Object.prototype.hasOwnProperty.call(data, 'locationId')) {
      entry.locationId = data.locationId ?? null;
    }
    if (data.status) entry.status = data.status;
    return this.repo.save(entry);
  }

  async confirm(id: string, orgId: string, userId: string): Promise<LogEntry> {
    const entry = await this.findOne(id, orgId);
    entry.status = LogStatus.CONFIRMED;
    entry.submittedBy = userId;
    entry.submittedAt = new Date();
    return this.repo.save(entry);
  }

  async hasPresetEntryForDate(orgId: string, presetId: string, date: Date): Promise<boolean> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const existing = await this.repo.findOne({
      where: {
        orgId,
        presetId,
        createdAt: Between(start, end),
      },
    });
    return Boolean(existing);
  }
}
