import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { LogEntry, LogStatus, LogType } from './entities/log-entry.entity';
import { Document } from '../documents/entities/document.entity';

const HISTORICAL_TEMPERATURE_UNITS = new Set([
  'Banco Refrigerato Bar (n.1)',
  'Banco Refrigerato Bar (n.2)',
  'Banco Refrigerato Bar (n.3)',
  'Pozzetto Freezer Cucina (n.4)',
]);
const CLEANING_OUTCOME_FIELDS = [
  'Machinery and equipment',
  'Work surfaces',
  'Sinks',
  'Walls and ceilings',
  'Floors',
  'Dishwashing area and utensils',
  'Fridges and freezers',
  'Waste containers',
  'Personal hygiene',
  'Staff facilities',
  'Shelves and cupboards',
];

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
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
  ) {}

  create(orgId: string, userId: string | null, data: CreateLogInput) {
    if (data.type === LogType.CLEANING) this.validateCleaningFields(data.fields);
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
    const query = this.repo.createQueryBuilder('log').where('log.org_id = :orgId', { orgId });
    if (type) query.andWhere('log.type = :type', { type });
    if (locationId) query.andWhere('log.location_id = :locationId', { locationId });
    if (status) query.andWhere('log.status = :status', { status });
    if (dateFrom || dateTo) {
      query.andWhere(
        'COALESCE(log.occurred_at, log.measured_at, log.created_at) BETWEEN :dateFrom AND :dateTo',
        {
          dateFrom: dateFrom ?? new Date('2000-01-01T00:00:00.000Z'),
          dateTo: dateTo ?? new Date('2999-12-31T23:59:59.999Z'),
        },
      );
    }
    return query.orderBy('COALESCE(log.occurred_at, log.measured_at, log.created_at)', 'DESC').getMany();
  }

  async findOne(id: string, orgId: string): Promise<LogEntry> {
    const entry = await this.repo.findOne({ where: { id, orgId } });
    if (!entry) throw new NotFoundException('Log entry not found');
    return entry;
  }

  async update(id: string, orgId: string, data: UpdateLogInput): Promise<LogEntry> {
    const entry = await this.findOne(id, orgId);
    if (entry.recordOrigin === 'historical_transcription') {
      throw new BadRequestException('Historical source transcriptions cannot be edited; add a new reviewed record instead');
    }
    if (data.fields) entry.fields = data.fields;
    if (entry.type === LogType.CLEANING && data.fields) this.validateCleaningFields(entry.fields);
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

  async backfill(
    orgId: string,
    userId: string,
    data: {
      type: LogType;
      fields: Record<string, any>;
      locationId?: string | null;
      createdAt: Date;
      status?: LogStatus;
      occurredAt?: Date | null;
      measuredAt?: Date | null;
    },
  ): Promise<LogEntry> {
    const status = data.status ?? LogStatus.CONFIRMED;
    const isConfirmed = status === LogStatus.CONFIRMED;
    const entry = await this.repo.save(
      this.repo.create({
        orgId,
        locationId: data.locationId ?? null,
        type: data.type,
        fields: data.fields ?? {},
        presetId: null,
        submittedBy: isConfirmed ? userId : null,
        submittedAt: isConfirmed ? data.createdAt : null,
        status,
        occurredAt: data.occurredAt ?? data.createdAt,
        measuredAt: data.measuredAt ?? data.createdAt,
        isException: false,
        exceptionReason: null,
        exceptionBy: null,
        exceptionAt: null,
      }),
    );
    // createdAt is a CreateDateColumn set automatically on insert; override it so
    // the entry lands on the requested (backdated) day for reports and filters.
    await this.repo
      .createQueryBuilder()
      .update(LogEntry)
      .set({ createdAt: data.createdAt })
      .where('id = :id', { id: entry.id })
      .execute();
    return this.findOne(entry.id, orgId);
  }

  async importHistoricalTemperatures(
    orgId: string,
    userId: string,
    sourceDocumentId: string,
    records: Array<{ date: string; unit: string; outcome: 'C' | 'NC'; page: number }>,
  ) {
    const source = await this.documents.findOne({ where: { id: sourceDocumentId, orgId } });
    if (!source || (source.mimeType !== 'application/pdf' && !source.name.toLowerCase().endsWith('.pdf'))) {
      throw new NotFoundException('Source PDF not found');
    }

    async importHistoricalCleaning(
      orgId: string,
      userId: string,
      sourceDocumentId: string,
      records: Array<{
        period: string;
        week: number;
        page: number;
        outcomes: Array<'C' | 'A' | 'NC'>;
        correctiveAction?: string;
      }>,
    ) {
      const source = await this.documents.findOne({ where: { id: sourceDocumentId, orgId } });
      if (!source || (source.mimeType !== 'application/pdf' && !source.name.toLowerCase().endsWith('.pdf'))) {
        throw new NotFoundException('Source PDF not found');
      }

      const existing = await this.repo.find({ where: { orgId, sourceDocumentId } });
      const existingKeys = new Set(existing.map((entry) =>
        `${entry.sourcePage}|${entry.fields['Source month']}|${entry.fields['Source week']}`,
      ));
      const uniqueRecords = new Map<string, (typeof records)[number]>();
      for (const record of records) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(record.period)) {
          throw new BadRequestException('Cleaning source periods must use YYYY-MM format');
        }
        if (!Number.isInteger(record.week) || record.week < 1 || record.week > 5 || record.outcomes.length !== CLEANING_OUTCOME_FIELDS.length ||
          record.outcomes.some((outcome) => !['C', 'A', 'NC'].includes(outcome))) {
          throw new BadRequestException('Each source week must include one C/A/NC outcome for every cleaning category');
        }
        const key = `${record.page}|${record.period}|${record.week}`;
        if (!uniqueRecords.has(key)) uniqueRecords.set(key, record);
      }
      const entries = [...uniqueRecords.entries()]
        .filter(([key]) => !existingKeys.has(key))
        .map(([, record]) => {
          const fields: Record<string, any> = {
            'Record origin': 'Historical transcription',
            'Source PDF': source.name,
            'Source page': record.page,
            'Source month': record.period,
            'Source week': record.week,
          };
          CLEANING_OUTCOME_FIELDS.forEach((category, index) => {
            fields[`Cleaning outcome — ${category}`] = record.outcomes[index];
          });
          if (record.correctiveAction?.trim()) fields['Corrective action'] = record.correctiveAction.trim();
          return this.repo.create({
            orgId,
            locationId: null,
            type: LogType.CLEANING,
            fields,
            status: LogStatus.CONFIRMED,
            submittedBy: userId,
            submittedAt: new Date(),
            presetId: null,
            occurredAt: null,
            measuredAt: null,
            recordOrigin: 'historical_transcription',
            sourceDocumentId,
            sourcePage: record.page,
            isException: false,
            exceptionReason: null,
            exceptionBy: null,
            exceptionAt: null,
          });
        });

      if (entries.length > 0) {
        await this.repo.manager.transaction(async (manager) => {
          await manager.save(LogEntry, entries);
        });
      }
      return { imported: entries.length, duplicates: uniqueRecords.size - entries.length };
    }

    const now = new Date();
    const uniqueRecords = new Map<string, { date: string; unit: string; outcome: 'C' | 'NC'; page: number }>();
    let skippedSundays = 0;
    for (const record of records) {
      if (!HISTORICAL_TEMPERATURE_UNITS.has(record.unit)) {
        throw new BadRequestException(`Unsupported historical temperature unit: ${record.unit}`);
      }
      const measuredAt = this.parseHistoricalDate(record.date);
      if (measuredAt > now) throw new BadRequestException('Historical log dates cannot be in the future');
      if (measuredAt.getUTCDay() === 0) {
        skippedSundays += 1;
        continue;
      }
      const key = `${record.date}|${record.unit}`;
      if (!uniqueRecords.has(key)) uniqueRecords.set(key, record);
    }

    const existing = await this.repo.find({ where: { orgId, sourceDocumentId } });
    const existingKeys = new Set(
      existing.map((entry) => {
        const date = entry.occurredAt?.toISOString().slice(0, 10);
        return `${date}|${entry.fields['Workstation / unit']}`;
      }),
    );
    const entries = [...uniqueRecords.values()]
      .filter((record) => !existingKeys.has(`${record.date}|${record.unit}`))
      .map((record) => this.repo.create({
        orgId,
        locationId: null,
        type: LogType.TEMPERATURE,
        fields: {
          'Workstation / unit': record.unit,
          'Original form outcome': record.outcome,
          'Record origin': 'Historical transcription',
          'Source PDF': source.name,
          'Source page': record.page,
        },
        status: LogStatus.CONFIRMED,
        submittedBy: userId,
        submittedAt: now,
        presetId: null,
        occurredAt: this.parseHistoricalDate(record.date),
        measuredAt: this.parseHistoricalDate(record.date),
        recordOrigin: 'historical_transcription',
        sourceDocumentId,
        sourcePage: record.page,
        isException: false,
        exceptionReason: null,
        exceptionBy: null,
        exceptionAt: null,
      }));

    if (entries.length > 0) {
      await this.repo.manager.transaction(async (manager) => {
        await manager.save(LogEntry, entries);
      });
    }
    return {
      imported: entries.length,
      skippedSundays,
      duplicates: uniqueRecords.size - entries.length,
    };
  }

  private parseHistoricalDate(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('Historical dates must be valid YYYY-MM-DD calendar dates');
    }
    return date;
  }

  private validateCleaningFields(fields: Record<string, any>) {
    for (const category of CLEANING_OUTCOME_FIELDS) {
      const outcome = fields[`Cleaning outcome — ${category}`];
      if (!['C', 'A', 'NC'].includes(outcome)) {
        throw new BadRequestException(`Select a C, A, or NC outcome for ${category}`);
      }
    }
    if (!['1', '2', '3', '4', '5'].includes(String(fields['Weekly check'] ?? ''))) {
      throw new BadRequestException('Select the week for this cleaning check');
    }
    if (
      CLEANING_OUTCOME_FIELDS.some((category) => fields[`Cleaning outcome — ${category}`] === 'NC') &&
      !String(fields['Corrective action'] ?? '').trim()
    ) {
      throw new BadRequestException('A corrective action is required when any cleaning category is non-compliant');
    }
  }

  async reset(orgId: string, scope: 'generated' | 'all'): Promise<{ deleted: number }> {
    const query = this.repo.createQueryBuilder().delete().from(LogEntry)
      .where('org_id = :orgId', { orgId })
      .andWhere('source_document_id IS NULL');
    if (scope === 'generated') {
      query.andWhere(`fields->>'source' LIKE 'supermode-%'`);
    }
    const result = await query.execute();
    return { deleted: result.affected ?? 0 };
  }

  async remove(id: string, orgId: string): Promise<void> {
    const entry = await this.findOne(id, orgId);
    if (entry.recordOrigin === 'historical_transcription') {
      throw new BadRequestException('Historical source transcriptions cannot be deleted');
    }
    await this.repo.remove(entry);
  }

  async confirm(id: string, orgId: string, userId: string): Promise<LogEntry> {
    const entry = await this.findOne(id, orgId);
    if (entry.recordOrigin === 'historical_transcription') {
      throw new BadRequestException('Historical source transcriptions are already reviewed and cannot be re-confirmed');
    }
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
    if (entry.recordOrigin === 'historical_transcription') {
      throw new BadRequestException('Historical source transcriptions cannot be changed through exception mode');
    }
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
