import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { Location } from './entities/location.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Location)
    private readonly locRepo: Repository<Location>,
  ) {}

  createOrg(data: Partial<Organization>) {
    return this.orgRepo.save(this.orgRepo.create(data));
  }

  findOrgById(id: string) {
    return this.orgRepo.findOne({ where: { id }, relations: ['locations'] });
  }

  async updateOrg(id: string, data: Partial<Organization>) {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organization not found');
    Object.assign(org, data);
    return this.orgRepo.save(org);
  }

  createLocation(orgId: string, data: Partial<Location>) {
    return this.locRepo.save(this.locRepo.create({ ...data, orgId }));
  }

  findLocationsByOrg(orgId: string) {
    return this.locRepo.find({ where: { orgId } });
  }

  async deleteLocation(id: string) {
    await this.locRepo.delete(id);
  }
}
