import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManualController } from './manual.controller';
import { ManualService } from './manual.service';
import { HaccpManualVersion } from './entities/haccp-manual-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HaccpManualVersion])],
  controllers: [ManualController],
  providers: [ManualService],
})
export class ManualModule {}

