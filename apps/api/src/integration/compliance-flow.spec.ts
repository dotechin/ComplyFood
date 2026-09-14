import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { DocumentCategory } from '@complyfood/shared';
import { AuthService } from '../modules/auth/auth.service';
import { OrganizationsService } from '../modules/organizations/organizations.service';
import { UsersService } from '../modules/users/users.service';
import { LogsService } from '../modules/logs/logs.service';
import { OverridesService } from '../modules/overrides/overrides.service';
import { AutomationService } from '../modules/automation/automation.service';
import { DocumentsService } from '../modules/documents/documents.service';
import { ReportsService } from '../modules/reports/reports.service';
import { AuditService } from '../modules/audit/audit.service';
import { UserRole } from '../common/decorators/roles.decorator';
import { LogEntry, LogStatus, LogType } from '../modules/logs/entities/log-entry.entity';
import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { Location } from '../modules/organizations/entities/location.entity';
import { OverrideRecord } from '../modules/overrides/entities/override-record.entity';
import { PresetRule } from '../modules/automation/entities/preset-rule.entity';
import { ReminderRule } from '../modules/automation/entities/reminder-rule.entity';
import { ReminderEvent } from '../modules/automation/entities/reminder-event.entity';
import { Document } from '../modules/documents/entities/document.entity';
import { AuditEvent } from '../modules/audit/entities/audit-event.entity';
import { ChecklistTemplate } from '../modules/checklists/entities/checklist-template.entity';
import { TEST_CONFIG, cleanupTestStorage, createTestDataSource } from '../test-utils/pg-mem';

describe('Compliance integration flow', () => {
  let dataSource: DataSource;
  let authService: AuthService;
  let organizationsService: OrganizationsService;
  let usersService: UsersService;
  let logsService: LogsService;
  let overridesService: OverridesService;
  let automationService: AutomationService;
  let documentsService: DocumentsService;
  let reportsService: ReportsService;
  let auditService: AuditService;

  beforeEach(async () => {
    ({ dataSource } = await createTestDataSource());
    usersService = new UsersService(dataSource.getRepository(User));
    organizationsService = new OrganizationsService(
      dataSource.getRepository(Organization),
      dataSource.getRepository(Location),
    );
    logsService = new LogsService(dataSource.getRepository(LogEntry));
    overridesService = new OverridesService(
      dataSource.getRepository(OverrideRecord),
      logsService,
    );
    automationService = new AutomationService(
      dataSource.getRepository(PresetRule),
      dataSource.getRepository(ReminderRule),
      dataSource.getRepository(ReminderEvent),
      logsService,
    );
    documentsService = new DocumentsService(dataSource.getRepository(Document));
    reportsService = new ReportsService(logsService, overridesService);
    auditService = new AuditService(dataSource.getRepository(AuditEvent));
    authService = new AuthService(
      usersService,
      new JwtService({ secret: TEST_CONFIG.jwtSecret }),
      dataSource,
    );
  });

  afterEach(async () => {
    await cleanupTestStorage();
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('covers bootstrap, organization/user setup, and password reset flows', async () => {
    const bootstrap = await authService.bootstrapOrganization(
      ' Trattoria Aurora ',
      'owner@example.com',
      'password123',
      ' Via Roma 12 ',
      ' restaurant ',
    );

    expect(bootstrap.user.role).toBe(UserRole.ADMIN);
    expect(bootstrap.user.orgId).toBeDefined();

    const organization = await organizationsService.findOrgById(bootstrap.user.orgId);
    expect(organization).toMatchObject({
      name: 'Trattoria Aurora',
      address: 'Via Roma 12',
      category: 'restaurant',
    });

    const location = await organizationsService.createLocation(
      bootstrap.user.orgId,
      bootstrap.user.orgId,
      { name: 'Main kitchen', address: 'Via Roma 12' },
    );
    expect(location.orgId).toBe(bootstrap.user.orgId);

    const staffUser = await usersService.create(
      'chef@example.com',
      'password123',
      UserRole.STAFF,
      bootstrap.user.orgId,
    );
    expect(staffUser.role).toBe(UserRole.STAFF);

    const reset = await authService.requestPasswordReset('chef@example.com');
    expect(reset.resetToken).toBeDefined();

    const updated = await authService.resetPassword(reset.resetToken!, 'newpassword123');
    expect(updated.message).toBe('Password updated successfully.');

    const authenticated = await authService.validateUser('chef@example.com', 'newpassword123');
    expect(authenticated.id).toBe(staffUser.id);
  });

  it('covers logs, overrides, automation, documents, reports, and audit queries', async () => {
    const bootstrap = await authService.bootstrapOrganization(
      'Osteria del Mercato',
      'owner@mercato.example',
      'password123',
    );
    const orgId = bootstrap.user.orgId;

    const preset = await automationService.createPreset(orgId, {
      type: LogType.TEMPERATURE,
      defaults: { item: 'Fridge 1', value: '4°C' },
      schedule: { active: true, weekdays: [0, 1, 2, 3, 4, 5, 6] },
    });
    expect(preset.orgId).toBe(orgId);

    const reminder = await automationService.createReminder(orgId, {
      type: 'temperature',
      cronExpression: '0 6 * * *',
      message: 'Complete opening temperature checks',
    });
    expect(reminder.message).toBe('Complete opening temperature checks');

    const generated = await automationService.generateDailyFormsForOrg(orgId);
    expect(generated).toHaveLength(1);

    const pendingLog = generated[0];
    const confirmed = await logsService.confirm(pendingLog.id, orgId, bootstrap.user.id);
    expect(confirmed.status).toBe(LogStatus.CONFIRMED);

    const override = await overridesService.create(bootstrap.user.id, orgId, {
      logEntryId: confirmed.id,
      fieldName: 'value',
      originalValue: '4°C',
      newValue: '6°C',
      reason: 'Door opened during delivery',
    });
    expect(override.reason).toBe('Door opened during delivery');

    const exception = await logsService.applyException(
      confirmed.id,
      orgId,
      bootstrap.user.id,
      'Temperature drift recorded',
      { unlockToStatus: LogStatus.PENDING },
    );
    expect(exception.isException).toBe(true);
    expect(exception.status).toBe(LogStatus.PENDING);

    const uploaded = await documentsService.upload(
      orgId,
      bootstrap.user.id,
      {
        originalname: 'permit 2026.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('permit-pdf'),
      },
      {
        category: DocumentCategory.PERMIT,
        linkedEntryId: confirmed.id,
        notes: ' Pilot permit ',
      },
    );
    expect(uploaded.category).toBe(DocumentCategory.PERMIT);

    const summary = await reportsService.getComplianceSummary(orgId);
    expect(summary.totalLogs).toBe(1);
    expect(summary.totalOverrides).toBe(1);
    expect(summary.exceptionSummary.total).toBe(1);
    expect(summary.overridesByField.value).toBe(1);

    const csv = await reportsService.generateCsv(orgId);
    expect(csv).toContain('6°C');

    const pdf = await reportsService.generatePdf(orgId);
    expect(pdf.toString('utf8')).toContain('%PDF-1.4');

    await dataSource.getRepository(AuditEvent).save(
      dataSource.getRepository(AuditEvent).create({
        orgId,
        entityType: 'LogsController',
        entityId: confirmed.id,
        action: 'PATCH',
        userId: bootstrap.user.id,
        payload: { path: '/api/v1/logs' },
      }),
    );

    const auditEvents = await auditService.findAll(orgId, 'LogsController', confirmed.id);
    expect(auditEvents).toHaveLength(1);

    const checklistTemplateRepo = dataSource.getRepository(ChecklistTemplate);
    const template = await checklistTemplateRepo.save(
      checklistTemplateRepo.create({
        orgId,
        name: 'Opening checklist',
        type: 'opening',
        fieldsConfig: { items: ['Check fridge temperature'] },
      }),
    );
    expect(template.id).toBeDefined();
  });
});
