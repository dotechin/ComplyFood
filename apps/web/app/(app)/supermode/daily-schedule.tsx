'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../../lib/api';
import { TEMPERATURE_UNITS, type TemperatureUnit } from '../logs/temperature-log';

type Appliance = { name: string; category: 'fridge' | 'freezer'; limit: number };
type Schedule = {
  id?: string;
  enabled: boolean;
  cadence: 'daily' | 'weekly';
  runTime: string;
  timezone: string;
  weeklyRunDay: number | null;
  openingDays: number[];
  appliances: Appliance[];
  lastRunLocalDate: string | null;
  lastRunAt: string | null;
  lastError: string | null;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const initialSchedule = (): Schedule => ({
  enabled: false,
  cadence: 'daily',
  runTime: '06:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  weeklyRunDay: 1,
  openingDays: [0, 1, 2, 3, 4, 5, 6],
  appliances: TEMPERATURE_UNITS.map((unit: TemperatureUnit) => ({
    name: unit.value,
    category: unit.category,
    limit: unit.category === 'freezer' ? -18 : 4,
  })),
  lastRunLocalDate: null,
  lastRunAt: null,
  lastError: null,
});

export function DailyScheduleSettings({ pin }: { pin: string }) {
  const [schedule, setSchedule] = useState<Schedule>(initialSchedule);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiGet<Schedule | null>('/automation/supermode-schedule')
      .then((saved) => saved && setSchedule(saved))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<Schedule>) => setSchedule((current) => ({ ...current, ...patch }));
  const toggleDay = (day: number) => update({
    openingDays: schedule.openingDays.includes(day)
      ? schedule.openingDays.filter((value) => value !== day)
      : [...schedule.openingDays, day].sort((a, b) => a - b),
  });
  const updateAppliance = (index: number, patch: Partial<Appliance>) => update({
    appliances: schedule.appliances.map((appliance, current) => current === index ? { ...appliance, ...patch } : appliance),
  });
  const addAppliance = () => {
    const name = newName.trim();
    if (!name || schedule.appliances.some((appliance) => appliance.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
    update({ appliances: [...schedule.appliances, { name, category: 'fridge', limit: 4 }] });
    setNewName('');
  };
  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await apiPost<Schedule>('/automation/supermode-schedule', {
        ...schedule,
        weeklyRunDay: schedule.cadence === 'weekly' ? schedule.weeklyRunDay : undefined,
        pin,
      });
      setSchedule(saved);
      setMessage('Server-side schedule saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-card">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Scheduled daily checks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The server prepares pending checks on opening days. Schedules persist when browsers are closed or the service restarts; generated checks are never marked complete automatically.
        </p>
      </div>
      {loading ? <p role="status">Loading schedule…</p> : (
        <>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input type="checkbox" checked={schedule.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
            Enable server-side schedule
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium text-foreground">
              Cadence
              <select value={schedule.cadence} onChange={(event) => update({ cadence: event.target.value as Schedule['cadence'] })} className="h-10 rounded-md border border-input bg-card px-3">
                <option value="daily">Daily</option><option value="weekly">Weekly</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-foreground">
              Local run time
              <input type="time" value={schedule.runTime} onChange={(event) => update({ runTime: event.target.value })} className="h-10 rounded-md border border-input bg-card px-3" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-foreground">
              Time zone (IANA)
              <input value={schedule.timezone} onChange={(event) => update({ timezone: event.target.value })} placeholder="Europe/Rome" className="h-10 rounded-md border border-input bg-card px-3" />
            </label>
            {schedule.cadence === 'weekly' && (
              <label className="grid gap-1 text-sm font-medium text-foreground">
                Run weekday
                <select value={schedule.weeklyRunDay ?? 1} onChange={(event) => update({ weeklyRunDay: Number(event.target.value) })} className="h-10 rounded-md border border-input bg-card px-3">
                  {DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
                </select>
              </label>
            )}
          </div>
          {schedule.cadence === 'weekly' && <p className="text-sm text-muted-foreground">Each run prepares separate pending checks for opening days in the following Monday–Sunday week.</p>}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Opening days</legend>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((day, index) => (
                <label key={day} className="flex items-center gap-1.5 text-sm text-foreground">
                  <input type="checkbox" checked={schedule.openingDays.includes(index)} onChange={() => toggleDay(index)} />
                  {day}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Appliances and temperature limits (°C)</legend>
            {schedule.appliances.map((appliance, index) => (
              <div key={`${appliance.name}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_150px_120px_auto]">
                <input aria-label="Appliance name" value={appliance.name} maxLength={80} onChange={(event) => updateAppliance(index, { name: event.target.value })} className="h-10 rounded-md border border-input bg-card px-3 text-sm" />
                <select aria-label="Appliance category" value={appliance.category} onChange={(event) => {
                  const category = event.target.value as Appliance['category'];
                  updateAppliance(index, { category, limit: category === 'freezer' ? -18 : 4 });
                }} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
                  <option value="fridge">Fridge</option><option value="freezer">Freezer</option>
                </select>
                <input aria-label="Temperature limit °C" type="number" step="0.1" value={appliance.limit} onChange={(event) => updateAppliance(index, { limit: Number(event.target.value) })} className="h-10 rounded-md border border-input bg-card px-3 text-sm" />
                <button type="button" disabled={schedule.appliances.length <= 1} onClick={() => update({ appliances: schedule.appliances.filter((_, current) => current !== index) })} className="h-10 rounded-md border border-border px-3 text-sm text-foreground disabled:opacity-50">Remove</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input aria-label="New appliance name" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} className="h-10 rounded-md border border-input bg-card px-3 text-sm" />
              <button type="button" onClick={addAppliance} className="h-10 rounded-md border border-border px-3 text-sm text-foreground">Add appliance</button>
            </div>
          </fieldset>
          {schedule.lastRunLocalDate && <p className="text-sm text-muted-foreground">Last successful scheduled run: {schedule.lastRunLocalDate}</p>}
          {schedule.lastError && <p role="alert" className="text-sm text-danger">Last scheduler error: {schedule.lastError}</p>}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {message && <p role="status" className="text-sm text-success">{message}</p>}
          <button type="button" disabled={saving} onClick={() => void save()} className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {saving ? 'Saving…' : 'Save schedule'}
          </button>
        </>
      )}
    </section>
  );
}
