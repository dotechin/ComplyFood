import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HaccpManualVersion, ManualStatus } from './entities/haccp-manual-version.entity';

type ManualSection = { key: string; title: string; content: string };

@Injectable()
export class ManualService {
  constructor(
    @InjectRepository(HaccpManualVersion)
    private readonly repo: Repository<HaccpManualVersion>,
  ) {}

  findAll(orgId: string) {
    return this.repo.find({ where: { orgId }, order: { versionNumber: 'DESC' } });
  }

  async findCurrent(orgId: string) {
    return this.repo.findOne({ where: { orgId }, order: { versionNumber: 'DESC' } });
  }

  async createFromTemplate(orgId: string, userId: string, businessType: string) {
    const sections = this.buildTemplateSections(businessType);
    return this.createVersion(orgId, userId, businessType, sections, []);
  }

  async createVersion(
    orgId: string,
    userId: string,
    businessType: string,
    sections: ManualSection[],
    linkedDocumentIds: string[],
    status: ManualStatus = ManualStatus.DRAFT,
  ) {
    const latest = await this.findCurrent(orgId);
    const nextVersion = (latest?.versionNumber ?? 0) + 1;
    return this.repo.save(
      this.repo.create({
        orgId,
        businessType,
        status,
        versionNumber: nextVersion,
        sections,
        linkedDocumentIds,
        createdBy: userId,
        approvedBy: status === ManualStatus.APPROVED ? userId : null,
        approvedAt: status === ManualStatus.APPROVED ? new Date() : null,
      }),
    );
  }

  async updateSection(
    orgId: string,
    userId: string,
    id: string,
    sectionKey: string,
    content: string,
    linkedDocumentIds?: string[],
  ) {
    const existing = await this.getById(orgId, id);
    const sections = existing.sections.map((section) =>
      section.key === sectionKey ? { ...section, content } : section,
    );
    return this.createVersion(
      orgId,
      userId,
      existing.businessType,
      sections,
      linkedDocumentIds ?? existing.linkedDocumentIds ?? [],
      ManualStatus.DRAFT,
    );
  }

  async approve(orgId: string, id: string, userId: string) {
    const version = await this.getById(orgId, id);
    version.status = ManualStatus.APPROVED;
    version.approvedBy = userId;
    version.approvedAt = new Date();
    return this.repo.save(version);
  }

  async exportPdf(orgId: string, id: string) {
    const version = await this.getById(orgId, id);
    const lines = [
      `ComplyFood HACCP Manual — ${version.businessType}`,
      `Version: ${version.versionNumber}`,
      `Status: ${version.status}`,
      '',
      ...version.sections.flatMap((section) => [`${section.title}`, section.content || '[Not completed]', '']),
    ];
    return this.buildPdf(lines);
  }

  private async getById(orgId: string, id: string) {
    const version = await this.repo.findOne({ where: { id, orgId } });
    if (!version) throw new NotFoundException('HACCP manual version not found');
    return version;
  }

  private buildTemplateSections(businessType: string): ManualSection[] {
    const base = [
      ['business_profile', 'Business Profile & Responsibilities'],
      ['hazard_analysis', 'Process Flow and Hazard Analysis'],
      ['ccp_limits', 'CCPs and Critical Limits'],
      ['monitoring', 'Monitoring Procedures'],
      ['corrective_actions', 'Corrective Actions'],
      ['verification', 'Verification and Validation'],
      ['sanitation', 'Cleaning and Sanitation Plan'],
      ['allergens', 'Allergen, Waste and Pest Management'],
      ['training', 'Staff Hygiene and Training'],
      ['records', 'Record Retention and Linked Documents'],
    ];
    return base.map(([key, title]) => ({
      key,
      title,
      content:
        key === 'business_profile'
          ? `Template generated for ${businessType}. Describe site, roles, and operating profile.`
          : '',
    }));
  }

  private buildPdf(lines: string[]): Buffer {
    const textCommands = lines
      .map((line, index) => `1 0 0 1 50 ${770 - index * 18} Tm (${this.escapePdfText(line)}) Tj`)
      .join('\n');
    const stream = `BT\n/F1 12 Tf\n${textCommands}\nET`;
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
      `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${object}\n`;
    }
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }

  private escapePdfText(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}

