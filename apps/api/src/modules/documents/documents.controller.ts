import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-url')
  getUploadUrl(
    @CurrentUser() user: any,
    @Body() body: { fileName: string; linkedEntryId?: string },
  ) {
    return this.documentsService.getUploadUrl(user.orgId, user.id, body.fileName, body.linkedEntryId);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.documentsService.findByOrg(user.orgId);
  }

  @Get('entry/:entryId')
  findByEntry(@Param('entryId') entryId: string) {
    return this.documentsService.findByLogEntry(entryId);
  }
}
