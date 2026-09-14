import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Allow, IsString, IsUUID, MinLength } from 'class-validator';
import { OverrideRecord } from './entities/override-record.entity';
import { LogsService } from '../logs/logs.service';
import { LogStatus } from '../logs/entities/log-entry.entity';

export class CreateOverrideDto {
  @IsUUID()
  logEntryId: string;

  @IsString()
  fieldName: string;

  @Allow()
  originalValue?: any;

  @Allow()
  newValue: any;

  @IsString()
  @MinLength(3)
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
    await this.logsService.update(entry.id, orgId, {
      status: LogStatus.OVERRIDDEN,
      fields: { ...entry.fields, [dto.fieldName]: dto.newValue },
    });

    const record = this.repo.create({ ...dto, userId });
    return this.repo.save(record);
  }

  async findByLogEntry(logEntryId: string, orgId: string) {
    await this.logsService.findOne(logEntryId, orgId);
    return this.repo.find({ where: { logEntryId }, order: { createdAt: 'DESC' } });
  }

  findByOrg(orgId: string) {
    // join via log_entries
    return this.repo
      .createQueryBuilder('or')
      .innerJoin('log_entries', 'le', 'le.id = or.log_entry_id AND le.org_id = :orgId', { orgId })
      .orderBy('or.created_at', 'DESC')
      .getMany();
  }
}
