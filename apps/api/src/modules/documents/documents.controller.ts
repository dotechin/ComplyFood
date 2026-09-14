import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentCategory } from '@complyfood/shared';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

class UploadDocumentDto {
  @IsOptional()
  @IsUUID()
  linkedEntryId?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @IsOptional()
  @IsString()
  notes?: string;
}

class FindDocumentsQueryDto {
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: any,
    @UploadedFile() file: any,
    @Body() body: UploadDocumentDto,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.documentsService.upload(user.orgId, user.id, file, body);
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: FindDocumentsQueryDto) {
    return this.documentsService.findByOrg(user.orgId, query.category);
  }

  @Get('entry/:entryId')
  findByEntry(@CurrentUser() user: any, @Param('entryId') entryId: string) {
    return this.documentsService.findByLogEntry(user.orgId, entryId);
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
