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
  occurredAt?: Date | null;
  measuredAt?: Date | null;
  isException?: boolean;
  exceptionReason?: string | null;
  exceptionBy?: string | null;
  exceptionAt?: Date | null;
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
        occurredAt: null,
        measuredAt: null,
        isException: false,
        exceptionReason: null,
        exceptionBy: null,
        exceptionAt: null,
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
    if (Object.prototype.hasOwnProperty.call(data, 'occurredAt')) {
      entry.occurredAt = data.occurredAt ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'measuredAt')) {
      entry.measuredAt = data.measuredAt ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'isException')) {
      entry.isException = Boolean(data.isException);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'exceptionReason')) {
      entry.exceptionReason = data.exceptionReason ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'exceptionBy')) {
      entry.exceptionBy = data.exceptionBy ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'exceptionAt')) {
      entry.exceptionAt = data.exceptionAt ?? null;
    }
    return this.repo.save(entry);
  }

  async confirm(id: string, orgId: string, userId: string): Promise<LogEntry> {
    const entry = await this.findOne(id, orgId);
    entry.status = LogStatus.CONFIRMED;
    entry.submittedBy = userId;
    entry.submittedAt = new Date();
    return this.repo.save(entry);
  }

  async applyException(
    id: string,
    orgId: string,
    userId: string,
    reason: string,
    data: { occurredAt?: Date; measuredAt?: Date; unlockToStatus?: LogStatus },
  ) {
    const entry = await this.findOne(id, orgId);
    entry.isException = true;
    entry.exceptionReason = reason;
    entry.exceptionBy = userId;
    entry.exceptionAt = new Date();
    entry.occurredAt = data.occurredAt ?? entry.occurredAt;
    entry.measuredAt = data.measuredAt ?? entry.measuredAt;
    if (data.unlockToStatus) {
      entry.status = data.unlockToStatus;
    }
    return this.repo.save(entry);
  }

  suggestTemperatureFromCapture(fileName: string) {
    const normalized = fileName.toLowerCase();
    const labeledValue = this.extractTemperatureAfterLabel(normalized);
    const unitQualifiedValue = this.extractUnitQualifiedTemperature(normalized);

    if (!labeledValue && !unitQualifiedValue) {
      return { extractedValue: null, confidence: 0.05, source: 'none' as const };
    }

    const rawValue = (labeledValue ?? unitQualifiedValue ?? '').replace(',', '.');
    return {
      extractedValue: `${rawValue}°C`,
      confidence: normalized.includes('temp') || normalized.includes('fridge') ? 0.72 : 0.52,
      source: 'filename' as const,
    };
  }

  private extractTemperatureAfterLabel(value: string) {
    for (const label of ['temperature', 'temp']) {
      let startIndex = 0;
      while (startIndex < value.length) {
        const labelIndex = value.indexOf(label, startIndex);
        if (labelIndex === -1) {
          break;
        }

        let cursor = labelIndex + label.length;
        let sawWhitespace = false;
        while (cursor < value.length && this.isSoftSeparator(value[cursor])) {
          if (value[cursor] === ' ') {
            sawWhitespace = true;
          }
          cursor += 1;
        }

        if (value[cursor] === '-' && value[cursor + 1] === '-' && this.isDigit(value[cursor + 2])) {
          return this.readSignedNumberToken(value, cursor + 1);
        }

        if (value[cursor] === '-' && this.isDigit(value[cursor + 1])) {
          return this.readSignedNumberToken(value, sawWhitespace || labelIndex === 0 ? cursor : cursor + 1);
        }

        const token = this.readSignedNumberToken(value, cursor);
        if (token) {
          return token;
        }

        startIndex = labelIndex + label.length;
      }
    }

    return null;
  }

  private extractUnitQualifiedTemperature(value: string) {
    for (let index = 0; index < value.length; index += 1) {
      const token = this.readSignedNumberToken(value, index);
      if (!token) {
        continue;
      }

      let cursor = index + token.length;
      while (cursor < value.length && value[cursor] === ' ') {
        cursor += 1;
      }
      if (value[cursor] === '°') {
        cursor += 1;
      }
      while (cursor < value.length && value[cursor] === ' ') {
        cursor += 1;
      }

      if (value[cursor] === 'c' || value[cursor] === 'f') {
        return token;
      }
    }

    return null;
  }

  private readSignedNumberToken(value: string, start: number) {
    if (start >= value.length) {
      return null;
    }

    let cursor = start;
    if (value[cursor] === '-') {
      if (!this.isDigit(value[cursor + 1])) {
        return null;
      }
      cursor += 1;
    } else if (!this.isDigit(value[cursor])) {
      return null;
    }

    while (cursor < value.length && this.isDigit(value[cursor])) {
      cursor += 1;
    }

    if ((value[cursor] === '.' || value[cursor] === ',') && this.isDigit(value[cursor + 1])) {
      cursor += 1;
      while (cursor < value.length && this.isDigit(value[cursor])) {
        cursor += 1;
      }
    }

    return value.slice(start, cursor);
  }

  private isDigit(value: string | undefined) {
    return Boolean(value && value >= '0' && value <= '9');
  }

  private isSoftSeparator(value: string | undefined) {
    return value === ' ' || value === '_';
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
