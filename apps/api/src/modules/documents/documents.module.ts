import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PdfParsingService } from './pdf-parsing.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document])],
  providers: [DocumentsService, PdfParsingService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
