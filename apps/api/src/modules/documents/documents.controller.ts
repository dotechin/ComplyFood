import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentCategory } from '@complyfood/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { MAX_DOCUMENT_BYTES } from './pdf-parsing.service';

class UploadDocumentDto {
  @IsOptional()
  @IsString()
  linkedEntryId?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FindDocumentsQueryDto {
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
  upload(
    @CurrentUser() user: any,
    @UploadedFile() file: any,
    @Body() body: UploadDocumentDto,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (body.category === DocumentCategory.HACCP_MANUAL && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can upload HACCP manual files');
    }
    if (body.category === DocumentCategory.HACCP_MANUAL && body.linkedEntryId) {
      throw new BadRequestException('HACCP manual files cannot be linked to log entries');
    }
    return this.documentsService.upload(user.orgId, user.id, file, body);
  }

  @Get()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
  findAll(@CurrentUser() user: any, @Query() query: FindDocumentsQueryDto) {
    return this.documentsService.findByOrg(user.orgId, query.category);
  }

  @Get('entry/:entryId')
  findByEntry(@CurrentUser() user: any, @Param('entryId') entryId: string) {
    return this.documentsService.findByLogEntry(user.orgId, entryId);
  }

  @Get(':id/extract')
  extract(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.extract(user.orgId, id);
  }

  @Delete(':id')
  @HttpCode(204)
  delete(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.delete(user.orgId, id, user.id, user.role);
  }

  @Get(':id/download')
  async download(@CurrentUser() user: any, @Param('id') id: string, @Res() res: Response) {
    const result = await this.documentsService.getDownload(user.orgId, id);
    if (!result) {
      throw new BadRequestException('Document not found');
    }
    res.setHeader('Content-Disposition', `attachment; filename="${result.name}"`);
    res.send(result.file);
  }
}
