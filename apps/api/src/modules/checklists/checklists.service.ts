import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChecklistTemplate } from './entities/checklist-template.entity';

@Injectable()
export class ChecklistsService {
  constructor(
    @InjectRepository(ChecklistTemplate)
    private readonly repo: Repository<ChecklistTemplate>,
  ) {}

  create(orgId: string, data: Partial<ChecklistTemplate>) {
    return this.repo.save(this.repo.create({ ...data, orgId }));
  }

  findAll(orgId: string) {
    return this.repo.find({ where: { orgId } });
  }

  async findOne(id: string, orgId: string) {
    const t = await this.repo.findOne({ where: { id, orgId } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async update(id: string, orgId: string, data: Partial<ChecklistTemplate>) {
    const t = await this.findOne(id, orgId);
    Object.assign(t, data);
    return this.repo.save(t);
  }

  async remove(id: string, orgId: string) {
    const t = await this.findOne(id, orgId);
    await this.repo.remove(t);
  }
}
