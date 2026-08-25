import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ): Promise<LogEntry[]> {
    const where: Record<string, any> = { orgId };
    if (type) where.type = type;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
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
}
