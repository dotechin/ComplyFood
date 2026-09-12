import { Body, Controller, Get, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ManualService } from './manual.service';
import { ManualStatus } from './entities/haccp-manual-version.entity';

class ManualSectionDto {
  @IsString()
  key: string;

  @IsString()
  title: string;

  @IsString()
  content: string;
}

class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  businessType: string;
}

class CreateManualVersionDto {
  @IsString()
  @MinLength(2)
  businessType: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualSectionDto)
  sections: ManualSectionDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  linkedDocumentIds?: string[];

  @IsOptional()
  @IsEnum(ManualStatus)
  status?: ManualStatus;
}

class UpdateSectionDto {
  @IsString()
  sectionKey: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  linkedDocumentIds?: string[];
}

@Controller('manual')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ManualController {
  constructor(private readonly manualService: ManualService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.manualService.findAll(user.orgId);
  }

  @Get('current')
  findCurrent(@CurrentUser() user: any) {
    return this.manualService.findCurrent(user.orgId);
  }

  @Post('template')
  @Roles(UserRole.ADMIN)
  createFromTemplate(@CurrentUser() user: any, @Body() dto: CreateTemplateDto) {
    return this.manualService.createFromTemplate(user.orgId, user.id, dto.businessType);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  createVersion(@CurrentUser() user: any, @Body() dto: CreateManualVersionDto) {
    return this.manualService.createVersion(
      user.orgId,
      user.id,
      dto.businessType,
      dto.sections,
      dto.linkedDocumentIds ?? [],
      dto.status ?? ManualStatus.DRAFT,
    );
  }

  @Patch(':id/section')
  @Roles(UserRole.ADMIN)
  updateSection(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.manualService.updateSection(
      user.orgId,
      user.id,
      id,
      dto.sectionKey,
      dto.content,
      dto.linkedDocumentIds,
    );
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  approve(@CurrentUser() user: any, @Param('id') id: string) {
    return this.manualService.approve(user.orgId, id, user.id);
  }

  @Get(':id/export/pdf')
  async exportPdf(@CurrentUser() user: any, @Param('id') id: string, @Res() res: Response) {
    const pdf = await this.manualService.exportPdf(user.orgId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="haccp-manual.pdf"');
    res.send(pdf);
  }
}

