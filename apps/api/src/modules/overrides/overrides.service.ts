import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OverrideRecord } from './entities/override-record.entity';
import { LogsService } from '../logs/logs.service';
import { LogStatus } from '../logs/entities/log-entry.entity';

export class CreateOverrideDto {
  logEntryId: string;
  fieldName: string;
  originalValue?: any;
  newValue: any;
  reason: string;
}

@Injectable()
export class OverridesService {
  constructor(
    @InjectRepository(OverrideRecord)
    private readonly repo: Repository<OverrideRecord>,
    private readonly logsService: LogsService,
  ) {}

  async create(userId: string, orgId: string, dto: CreateOverrideDto): Promise<OverrideRecord> {
    if (!dto.reason || dto.reason.trim().length < 3) {
      throw new BadRequestException('A reason is required for every override');
    }
    const entry = await this.logsService.findOne(dto.logEntryId, orgId);
    // Mark log entry as overridden
    entry.status = LogStatus.OVERRIDDEN;
    // Update the specific field in log entry fields
    entry.fields = { ...entry.fields, [dto.fieldName]: dto.newValue };
    await this.logsService['repo'].save(entry);

    const record = this.repo.create({ ...dto, userId });
    return this.repo.save(record);
  }

  findByLogEntry(logEntryId: string) {
    return this.repo.find({ where: { logEntryId }, order: { createdAt: 'DESC' } });
  }

  findByOrg(orgId: string) {
    // join via log_entries
    return this.repo
      .createQueryBuilder('or')
      .innerJoin('log_entries', 'le', 'le.id = or.log_entry_id AND le.org_id = :orgId', { orgId })
      .orderBy('or.createdAt', 'DESC')
      .getMany();
  }
}
