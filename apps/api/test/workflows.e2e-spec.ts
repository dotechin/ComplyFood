import { DocumentCategory } from '@complyfood/shared';
import { cleanupTestStorage, createTestApp, destroyTestApp } from '../src/test-utils/pg-mem';
import { LogType } from '../src/modules/logs/entities/log-entry.entity';
import { ReminderEvent } from '../src/modules/automation/entities/reminder-event.entity';

describe('ComplyFood API workflows (e2e)', () => {
  let baseUrl: string;
  let app: Awaited<ReturnType<typeof createTestApp>>['app'];
  let dataSource: Awaited<ReturnType<typeof createTestApp>>['dataSource'];

  beforeEach(async () => {
    ({ app, dataSource } = await createTestApp());
    await app.listen(0);
    const server = app.getHttpServer();
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Could not determine test server address');
    }
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  });

  afterEach(async () => {
    await cleanupTestStorage();
    await destroyTestApp(app, dataSource);
  });

  it('supports admin setup, staff workflow, documents, and report exports', async () => {
    const bootstrap = await postJson('/auth/bootstrap', {
      organizationName: 'Trattoria Aurora',
      organizationAddress: 'Via Roma 12',
      organizationCategory: 'restaurant',
      email: 'owner@aurora.example.com',
      password: 'password123',
    });
    expect(bootstrap.status).toBe(201);
    const adminToken = bootstrap.body.accessToken as string;
    const orgId = bootstrap.body.user.orgId as string;

    const location = await postJson(
      `/organizations/${orgId}/locations`,
      { name: 'Main kitchen', address: 'Via Roma 12' },
      adminToken,
    );
    expect(location.status).toBe(201);

    const staffUser = await postJson(
      '/users',
      { email: 'chef@aurora.example.com', password: 'password123', role: 'staff' },
      adminToken,
    );
    expect(staffUser.status).toBe(201);

    const preset = await postJson(
      '/automation/presets',
      {
        type: LogType.TEMPERATURE,
        defaults: { item: 'Fridge 1', value: '4°C' },
        schedule: { active: true, weekdays: [0, 1, 2, 3, 4, 5, 6] },
      },
      adminToken,
    );
    expect(preset.status).toBe(201);

    const reminder = await postJson(
      '/automation/reminders',
      {
        type: 'temperature',
        cronExpression: '0 6 * * *',
        message: 'Complete opening temperature checks',
      },
      adminToken,
    );
    expect(reminder.status).toBe(201);

    const generated = await postJson('/automation/generate', {}, adminToken);
    expect(generated.status).toBe(201);
    expect(generated.body).toHaveLength(1);
    const generatedLogId = generated.body[0].id as string;

    const staffLogin = await postJson('/auth/login', {
      email: 'chef@aurora.example.com',
      password: 'password123',
    });
    expect(staffLogin.status).toBe(201);
    const staffToken = staffLogin.body.accessToken as string;

    const createdLog = await postJson(
      '/logs',
      {
        type: LogType.CLEANING,
        fields: { task: 'Opening sanitation', responsible: 'Chef' },
        locationId: location.body.id,
      },
      staffToken,
    );
    expect(createdLog.status).toBe(201);

    const confirmed = await patchJson(`/logs/${generatedLogId}/confirm`, {}, staffToken);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.status).toBe('confirmed');

    const override = await postJson(
      '/overrides',
      {
        logEntryId: generatedLogId,
        fieldName: 'value',
        originalValue: '4°C',
        newValue: '6°C',
        reason: 'Door was open during receiving',
      },
      staffToken,
    );
    expect(override.status).toBe(201);

    const generalDocument = await uploadDocument(
      '/documents',
      { notes: 'Opening checklist photo', linkedEntryId: createdLog.body.id },
      staffToken,
      'opening-check.jpg',
      'image/jpeg',
      'jpeg-data',
    );
    expect(generalDocument.status).toBe(201);

    const manualDocument = await uploadDocument(
      '/documents',
      { category: DocumentCategory.HACCP_MANUAL, notes: 'Current manual' },
      adminToken,
      'manual.pdf',
      'application/pdf',
      'pdf-data',
    );
    expect(manualDocument.status).toBe(201);

    const dashboard = await getJson('/automation/dashboard', adminToken);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.pendingLogs.length).toBeGreaterThanOrEqual(1);

    const reports = await getJson('/reports/summary', adminToken);
    expect(reports.status).toBe(200);
    expect(reports.body.totalOverrides).toBe(1);

    const csv = await fetch(`${baseUrl}/reports/export/csv`, {
      headers: withToken(adminToken),
    });
    expect(csv.status).toBe(200);
    expect(await csv.text()).toContain('6°C');

    const pdf = await fetch(`${baseUrl}/reports/export/pdf`, {
      headers: withToken(adminToken),
    });
    expect(pdf.status).toBe(200);
    expect(Buffer.from(await pdf.arrayBuffer()).toString('utf8')).toContain('%PDF-1.4');
  });

  it('supports password reset and reminder acknowledgement flows', async () => {
    const bootstrap = await postJson('/auth/bootstrap', {
      organizationName: 'Osteria del Mercato',
      email: 'owner@mercato.example.com',
      password: 'password123',
    });
    const adminToken = bootstrap.body.accessToken as string;

    const reminder = await postJson(
      '/automation/reminders',
      {
        type: 'temperature',
        cronExpression: '0 6 * * *',
        message: 'Complete temperature tasks',
      },
      adminToken,
    );
    expect(reminder.status).toBe(201);

    const reminderRuleId = reminder.body.id as string;
    const reminderRepo = dataSource.getRepository(ReminderEvent);
    await reminderRepo.save({
      orgId: bootstrap.body.user.orgId,
      reminderRuleId,
      type: 'temperature',
      message: 'Complete temperature tasks',
      scheduledFor: new Date('2026-09-14T06:00:00.000Z'),
      acknowledgedAt: null,
    });

    const due = await getJson('/automation/reminders/due', adminToken);
    expect(due.status).toBe(200);
    expect(due.body).toHaveLength(1);

    const acknowledged = await postJson(
      `/automation/reminders/${due.body[0].id}/acknowledge`,
      {},
      adminToken,
    );
    expect(acknowledged.status).toBe(201);
    expect(acknowledged.body.acknowledgedAt).toBeTruthy();

    const requestReset = await postJson('/auth/password-reset/request', {
      email: 'owner@mercato.example.com',
    });
    expect(requestReset.status).toBe(201);
    expect(requestReset.body.resetToken).toBeTruthy();

    const confirmReset = await postJson('/auth/password-reset/confirm', {
      token: requestReset.body.resetToken,
      password: 'newpassword123',
    });
    expect(confirmReset.status).toBe(201);

    const login = await postJson('/auth/login', {
      email: 'owner@mercato.example.com',
      password: 'newpassword123',
    });
    expect(login.status).toBe(201);
    expect(login.body.accessToken).toBeTruthy();
  });

  async function getJson(path: string, token?: string) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: token ? withToken(token) : undefined,
    });
    return {
      status: response.status,
      body: await readBody(response),
    };
  }

  async function postJson(path: string, body: unknown, token?: string) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? withToken(token) : {}),
      },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      body: await readBody(response),
    };
  }

  async function patchJson(path: string, body: unknown, token: string) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...withToken(token),
      },
      body: JSON.stringify(body),
    });
    return {
      status: response.status,
      body: await readBody(response),
    };
  }

  async function uploadDocument(
    path: string,
    fields: Record<string, string>,
    token: string,
    fileName: string,
    contentType: string,
    content: string,
  ) {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => form.append(key, value));
    form.append('file', new Blob([content], { type: contentType }), fileName);

    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: withToken(token),
      body: form,
    });
    return {
      status: response.status,
      body: await readBody(response),
    };
  }

  function withToken(token: string) {
    return {
      authorization: 'Bearer '.concat(token),
    };
  }

  async function readBody(response: Response) {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
});
