import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { rm } from 'fs/promises';
import { join } from 'path';
import { DataType, newDb } from 'pg-mem';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { OrganizationsModule } from '../modules/organizations/organizations.module';
import { LogsModule } from '../modules/logs/logs.module';
import { ChecklistsModule } from '../modules/checklists/checklists.module';
import { OverridesModule } from '../modules/overrides/overrides.module';
import { AutomationModule } from '../modules/automation/automation.module';
import { ReportsModule } from '../modules/reports/reports.module';
import { DocumentsModule } from '../modules/documents/documents.module';
import { AuditModule } from '../modules/audit/audit.module';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { Location } from '../modules/organizations/entities/location.entity';
import { User } from '../modules/users/entities/user.entity';
import { LogEntry } from '../modules/logs/entities/log-entry.entity';
import { ChecklistTemplate } from '../modules/checklists/entities/checklist-template.entity';
import { OverrideRecord } from '../modules/overrides/entities/override-record.entity';
import { PresetRule } from '../modules/automation/entities/preset-rule.entity';
import { ReminderRule } from '../modules/automation/entities/reminder-rule.entity';
import { ReminderEvent } from '../modules/automation/entities/reminder-event.entity';
import { Document } from '../modules/documents/entities/document.entity';
import { AuditEvent } from '../modules/audit/entities/audit-event.entity';

export const TEST_ENTITIES = [
  Organization,
  Location,
  User,
  LogEntry,
  ChecklistTemplate,
  OverrideRecord,
  PresetRule,
  ReminderRule,
  ReminderEvent,
  Document,
  AuditEvent,
];

export const TEST_CONFIG = {
  jwtSecret: 'test-secret',
  jwtExpiresIn: '1d',
  webUrl: 'http://localhost:3000',
  nodeEnv: 'test',
  storageDriver: 'local',
} as const;

function applyRuntimeTestEnv() {
  process.env.WEB_URL ??= TEST_CONFIG.webUrl;
  process.env.NODE_ENV ??= TEST_CONFIG.nodeEnv;
  process.env.STORAGE_DRIVER ??= TEST_CONFIG.storageDriver;
}

export async function createTestDataSource() {
  applyRuntimeTestEnv();

  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({ name: 'current_database', implementation: () => 'complyfood_test' });
  db.public.registerFunction({ name: 'version', implementation: () => 'PostgreSQL 16.0' });
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    impure: true,
    returns: DataType.uuid,
    implementation: () => randomUUID(),
  });
  db.public.interceptQueries((sql) => {
    if (/^LOCK TABLE /i.test(sql)) {
      return [];
    }
    return null;
  });

  const dataSource = db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: TEST_ENTITIES,
    synchronize: true,
  });

  await dataSource.initialize();

  return { db, dataSource };
}

export async function createTestApp() {
  const { dataSource } = await createTestDataSource();

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        load: [
          () => ({
            JWT_SECRET: TEST_CONFIG.jwtSecret,
            JWT_EXPIRES_IN: TEST_CONFIG.jwtExpiresIn,
          }),
        ],
      }),
      TypeOrmModule.forRootAsync({
        useFactory: async () => ({
          type: 'postgres',
          entities: TEST_ENTITIES,
          synchronize: false,
        }),
        dataSourceFactory: async () => dataSource,
      }),
      ScheduleModule.forRoot(),
      AuthModule,
      UsersModule,
      OrganizationsModule,
      LogsModule,
      ChecklistsModule,
      OverridesModule,
      AutomationModule,
      ReportsModule,
      DocumentsModule,
      AuditModule,
    ],
    providers: [
      {
        provide: APP_INTERCEPTOR,
        useClass: AuditInterceptor,
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  return { app, dataSource };
}

export async function destroyTestApp(
  app: INestApplication | undefined,
  dataSource: { destroy(): Promise<void>; isInitialized?: boolean } | undefined,
) {
  if (app) {
    await app.close();
  }
  if (dataSource && dataSource.isInitialized !== false) {
    await dataSource.destroy();
  }
}

export async function cleanupTestStorage() {
  await rm(join(process.cwd(), 'storage'), { recursive: true, force: true });
}
