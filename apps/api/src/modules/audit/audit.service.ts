import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private readonly repo: Repository<AuditEvent>,
  ) {}

  findAll(entityType?: string, entityId?: string) {
    const qb = this.repo.createQueryBuilder('ae').orderBy('ae.createdAt', 'DESC');
    if (entityType) qb.andWhere('ae.entityType = :entityType', { entityType });
    if (entityId) qb.andWhere('ae.entityId = :entityId', { entityId });
    return qb.getMany();
  }
}
