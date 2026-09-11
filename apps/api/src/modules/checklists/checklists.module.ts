import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChecklistTemplate } from './entities/checklist-template.entity';
import { ChecklistsService } from './checklists.service';
import { ChecklistsController } from './checklists.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChecklistTemplate]), LogsModule],
  providers: [ChecklistsService],
  controllers: [ChecklistsController],
  exports: [ChecklistsService],
})
export class ChecklistsModule {}
