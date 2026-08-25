'use client';

import { useEffect, useState } from 'react';
import {
  UserRole,
  type Location,
  type Organization,
  type PresetRule,
  type ReminderRule,
  type User,
} from '@complyfood/shared';
import { apiGet, apiPatch, apiPost } from '../../../lib/api';

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [presets, setPresets] = useState<PresetRule[]>([]);
  const [reminders, setReminders] = useState<ReminderRule[]>([]);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [presetType, setPresetType] = useState('temperature');
  const [presetDefaults, setPresetDefaults] = useState('{"item":"Fridge 1","temperature":"4"}');
  const [reminderType, setReminderType] = useState('temperature');
  const [cronExpression, setCronExpression] = useState('0 6 * * *');
  const [error, setError] = useState('');

  useEffect(() => {
    void Promise.all([
      apiGet<Organization>('/organizations/me'),
      apiGet<User[]>('/users'),
      apiGet<PresetRule[]>('/automation/presets'),
      apiGet<ReminderRule[]>('/automation/reminders'),
    ])
      .then(([org, orgUsers, orgPresets, orgReminders]) => {
        setOrganization(org);
        setUsers(orgUsers);
        setPresets(orgPresets);
        setReminders(orgReminders);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const updateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    const updated = await apiPatch<Organization>(`/organizations/${organization.id}`, {
      name: organization.name,
      address: organization.address,
      category: organization.category,
    });
    setOrganization(updated);
  };

  const addLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !locationName.trim()) return;
    const location = await apiPost<Location>(`/organizations/${organization.id}/locations`, {
      name: locationName,
      address: locationAddress,
    });
    setOrganization((prev) =>
      prev ? { ...prev, locations: [...(prev.locations ?? []), location] } : prev,
    );
    setLocationName('');
    setLocationAddress('');
  };

  const createPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    const preset = await apiPost<PresetRule>('/automation/presets', {
      type: presetType,
      defaults: JSON.parse(presetDefaults),
    });
    setPresets((prev) => [preset, ...prev]);
  };

  const createReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    const reminder = await apiPost<ReminderRule>('/automation/reminders', {
      type: reminderType,
      cronExpression,
    });
    setReminders((prev) => [reminder, ...prev]);
  };

  const updateRole = async (userId: string, role: UserRole) => {
    const updated = await apiPatch<User>(`/users/${userId}/role`, { role });
    setUsers((prev) => prev.map((user) => (user.id === userId ? updated : user)));
  };

  const generateDailyTasks = async () => {
    await apiPost('/automation/generate', {});
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Organization profile, user management, locations, presets, and reminder rules.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {organization ? (
        <form onSubmit={updateOrganization} className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Organization profile</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={organization.name}
              onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Organization name"
            />
            <input
              value={organization.address ?? ''}
              onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Address"
            />
            <input
              value={organization.category ?? ''}
              onChange={(e) => setOrganization({ ...organization, category: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Business category"
            />
          </div>
          <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Save organization
          </button>
        </form>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={addLocation} className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Locations</h2>
          <div className="space-y-3">
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Location name"
            />
            <input
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Location address"
            />
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Add location
            </button>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            {(organization?.locations ?? []).map((location) => (
              <li key={location.id}>
                {location.name} {location.address ? `— ${location.address}` : ''}
              </li>
            ))}
          </ul>
        </form>

        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
            <button
              type="button"
              onClick={() => void generateDailyTasks()}
              className="rounded-md border border-blue-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
            >
              Generate today&apos;s tasks
            </button>
          </div>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-md bg-gray-50 p-3">
                <div>
                  <p className="font-medium text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
                <select
                  value={user.role}
                  onChange={(e) => void updateRole(user.id, e.target.value as UserRole)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
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
        <form onSubmit={createPreset} className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Automation presets</h2>
          <div className="space-y-3">
            <input
              value={presetType}
              onChange={(e) => setPresetType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Preset type"
            />
            <textarea
              value={presetDefaults}
              onChange={(e) => setPresetDefaults(e.target.value)}
              className="h-32 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Save preset
            </button>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            {presets.map((preset) => (
              <li key={preset.id}>
                {preset.type}: {JSON.stringify(preset.defaults)}
              </li>
            ))}
          </ul>
        </form>

        <form onSubmit={createReminder} className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Reminders</h2>
          <div className="space-y-3">
            <input
              value={reminderType}
              onChange={(e) => setReminderType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Reminder type"
            />
            <input
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Cron expression"
            />
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Save reminder
            </button>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            {reminders.map((reminder) => (
              <li key={reminder.id}>
                {reminder.type}: {reminder.cronExpression}
              </li>
            ))}
          </ul>
        </form>
      </div>
    </div>
  );
}
