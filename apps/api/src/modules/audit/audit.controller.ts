import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditService } from './audit.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  findAll(
    @CurrentUser() user: any,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.auditService.findAll(user.orgId, entityType, entityId);
  }
}
