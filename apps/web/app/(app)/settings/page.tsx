'use client';

import { useEffect, useState } from 'react';
import {
  UserRole,
  sortUsersOldestFirst,
  upsertUserOldestFirst,
  type Location,
  type Organization,
  type PresetRule,
  type ReminderRule,
  type User,
} from '@complyfood/shared';
import { apiGet, apiPatch, apiPost } from '../../../lib/api';
import { ActionButton, PlusIcon, RefreshIcon, SaveIcon } from '../../../components/icon-button';

function parseJson<T>(value: string, fallback: T): T {
  if (!value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error('Enter valid JSON before saving.');
  }
}

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [presets, setPresets] = useState<PresetRule[]>([]);
  const [reminders, setReminders] = useState<ReminderRule[]>([]);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [presetType, setPresetType] = useState('temperature');
  const [presetDefaults, setPresetDefaults] = useState('{"item":"Fridge 1","temperature":"4"}');
  const [presetSchedule, setPresetSchedule] = useState('{"active":true,"weekdays":[1,2,3,4,5,6,0]}');
  const [reminderType, setReminderType] = useState('temperature');
  const [reminderMessage, setReminderMessage] = useState('Complete temperature tasks');
  const [cronExpression, setCronExpression] = useState('0 6 * * *');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.STAFF);
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('complyfood-language') : null;
    if (stored) setLanguage(stored);
  }, []);

  const changeLanguage = (value: string) => {
    setLanguage(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('complyfood-language', value);
    }
    setMessage('Language preference saved. Full localization is coming soon.');
  };

  useEffect(() => {
    apiGet<User>('/users/me')
      .then((me) => {
        setCurrentUser(me);
        if (me.role !== UserRole.ADMIN) {
          return null;
        }
        return Promise.all([
          apiGet<Organization>('/organizations/me'),
          apiGet<User[]>('/users'),
          apiGet<PresetRule[]>('/automation/presets'),
          apiGet<ReminderRule[]>('/automation/reminders'),
        ]);
      })
      .then((data) => {
        if (!data) return;
        const [org, orgUsers, orgPresets, orgReminders] = data;
        setOrganization(org);
        setUsers(sortUsersOldestFirst(orgUsers));
        setPresets(orgPresets);
        setReminders(orgReminders);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const updateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setError('');
    const updated = await apiPatch<Organization>(`/organizations/${organization.id}`, {
      name: organization.name,
      address: organization.address,
      category: organization.category,
    });
    setOrganization(updated);
    setMessage('Organization saved.');
  };

  const addLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !locationName.trim()) return;
    setError('');
    const location = await apiPost<Location>(`/organizations/${organization.id}/locations`, {
      name: locationName,
      address: locationAddress,
    });
    setOrganization((prev) =>
      prev ? { ...prev, locations: [...(prev.locations ?? []), location] } : prev,
    );
    setLocationName('');
    setLocationAddress('');
    setMessage('Location added.');
  };

  const createPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      const preset = await apiPost<PresetRule>('/automation/presets', {
        type: presetType,
        defaults: parseJson<Record<string, unknown>>(presetDefaults, {}),
        schedule: parseJson<Record<string, unknown>>(presetSchedule, { active: true }),
      });
      setPresets((prev) => [preset, ...prev]);
      setMessage('Preset saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save preset');
    }
  };

  const createReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      const reminder = await apiPost<ReminderRule>('/automation/reminders', {
        type: reminderType,
        cronExpression,
        message: reminderMessage,
        isActive: true,
      });
      setReminders((prev) => [reminder, ...prev]);
      setMessage('Reminder saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save reminder');
    }
  };

  const updateRole = async (userId: string, role: UserRole) => {
    try {
      const updated = await apiPatch<User>(`/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
      setMessage('User role updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update role');
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setMessage('');
      const created = await apiPost<User>('/users', {
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      });
      setUsers((prev) => upsertUserOldestFirst(prev, created));
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole(UserRole.STAFF);
      setMessage('User created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create user');
    }
  };

  const generateDailyTasks = async () => {
    try {
      await apiPost('/automation/generate', {});
      setMessage('Daily tasks generated for active presets.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate daily tasks');
    }
  };

  if (currentUser && currentUser.role !== UserRole.ADMIN) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-card">
        Settings are available to organization admins.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Organization profile, user management, locations, presets, and reminder rules.
        </p>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        {message && <p className="mt-2 text-sm text-success">{message}</p>}
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-card">
        <h2 className="mb-1 text-lg font-semibold text-foreground">Localization</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Choose your preferred language. Full interface translation is coming soon.
        </p>
        <div className="max-w-xs">
          <label htmlFor="language" className="mb-1 block text-sm font-medium text-foreground">
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="en">English</option>
            <option value="it">Italiano</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="pt">Português</option>
          </select>
        </div>
      </div>

      {organization ? (
        <form onSubmit={updateOrganization} className="rounded-lg border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Organization profile</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={organization.name}
              onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
              className="rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Organization name"
            />
            <input
              value={organization.address ?? ''}
              onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
              className="rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Address"
            />
            <input
              value={organization.category ?? ''}
              onChange={(e) => setOrganization({ ...organization, category: e.target.value })}
              className="rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Business category"
            />
          </div>
          <div className="mt-4">
            <ActionButton type="submit" variant="primary" icon={<SaveIcon />} label="Save organization" />
          </div>
        </form>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={addLocation} className="rounded-lg border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Locations</h2>
          <div className="space-y-3">
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Location name"
            />
            <input
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Location address"
            />
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {(organization?.locations ?? []).map((location) => (
              <li key={location.id}>
                {location.name} {location.address ? `— ${location.address}` : ''}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end">
            <ActionButton type="submit" variant="primary" icon={<PlusIcon />} label="Add location" />
          </div>
        </form>

        <div className="rounded-lg border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Users</h2>
            <ActionButton icon={<RefreshIcon />} label="Generate today's tasks" onClick={() => void generateDailyTasks()} />
          </div>
          <form onSubmit={createUser} className="mb-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor="newUserEmail" className="block text-sm font-medium text-foreground">
                  User email
                </label>
                <input
                  id="newUserEmail"
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                  placeholder="User email"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="newUserPassword" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <input
                  id="newUserPassword"
                  type="password"
                  required
                  minLength={8}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                  placeholder="Password"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="newUserRole" className="block text-sm font-medium text-foreground">
                  Role
                </label>
                <select
                  id="newUserRole"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm"
                >
                  {Object.values(UserRole).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <ActionButton type="submit" variant="primary" icon={<PlusIcon />} label="Add user" />
            </div>
          </form>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-md bg-muted p-3">
                <div>
                  <p className="font-medium text-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
                <select
                  value={user.role}
                  onChange={(e) => void updateRole(user.id, e.target.value as UserRole)}
                  className="rounded-md border border-input px-3 py-2 text-sm"
                >
                  {Object.values(UserRole).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={createPreset} className="rounded-lg border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Automation presets</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Presets create scheduled pending log entries with default values. They do not send reminders.
          </p>
          <div className="space-y-3">
            <input
              value={presetType}
              onChange={(e) => setPresetType(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Preset type"
            />
            <textarea
              value={presetDefaults}
              onChange={(e) => setPresetDefaults(e.target.value)}
              className="h-28 w-full rounded-md border border-input px-3 py-2 text-sm"
            />
            <textarea
              value={presetSchedule}
              onChange={(e) => setPresetSchedule(e.target.value)}
              className="h-24 w-full rounded-md border border-input px-3 py-2 text-sm"
            />
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {presets.map((preset) => (
              <li key={preset.id}>
                <span className="font-medium">{preset.type}</span>: {JSON.stringify(preset.defaults)} · schedule{' '}
                {JSON.stringify(preset.schedule)}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end">
            <ActionButton type="submit" variant="primary" icon={<SaveIcon />} label="Save preset" />
          </div>
        </form>

        <form onSubmit={createReminder} className="rounded-lg border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Reminders</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Reminders create scheduled dashboard notifications. They do not create log entries.
          </p>
          <div className="space-y-3">
            <input
              value={reminderType}
              onChange={(e) => setReminderType(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Reminder type"
            />
            <input
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Reminder message"
            />
            <input
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
              placeholder="Cron expression"
            />
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {reminders.map((reminder) => (
              <li key={reminder.id}>
                <span className="font-medium">{reminder.type}</span>: {reminder.cronExpression} ·{' '}
                {reminder.message ?? 'No message'} · {reminder.isActive ? 'active' : 'inactive'}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end">
            <ActionButton type="submit" variant="primary" icon={<SaveIcon />} label="Save reminder" />
          </div>
        </form>
      </div>
    </div>
  );
}
