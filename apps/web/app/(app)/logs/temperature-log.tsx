import { useEffect, useState } from 'react';
import { ActionButton, CheckIcon, CloseIcon, PlusIcon, TrashIcon } from '../../../components/icon-button';

export type TemperatureUnitCategory = 'fridge' | 'freezer';
export type TemperatureUnit = { value: string; label: string; category: TemperatureUnitCategory };

export const TEMPERATURE_UNITS: TemperatureUnit[] = [
  { value: 'Banco Refrigerato Bar (n.1)', label: 'Bar counter 1', category: 'fridge' },
  { value: 'Banco Refrigerato Bar (n.2)', label: 'Bar counter 2', category: 'fridge' },
  { value: 'Banco Refrigerato Bar (n.3)', label: 'Bar counter 3', category: 'fridge' },
  { value: 'Pozzetto Freezer Cucina (n.4)', label: 'Kitchen chest freezer 4', category: 'freezer' },
];

const SELECT_CLASSES = 'h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground';
const INPUT_CLASSES = 'h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const FIELDS = [
  { key: 'amTemp', label: 'AM Temp', kind: 'temp' },
  { key: 'amInitials', label: 'AM Initials', kind: 'initials' },
  { key: 'pmTemp', label: 'PM Temp', kind: 'temp' },
  { key: 'pmInitials', label: 'PM Initials', kind: 'initials' },
  { key: 'comment', label: 'Corrective Actions / Comments', kind: 'comment' },
] as const;
const ENTRIES_STORAGE_PREFIX = 'complyfood-temperature-sheet';

function isOutOfRange(value: string, category: TemperatureUnitCategory) {
  const n = Number(value);
  if (value.trim() === '' || Number.isNaN(n)) return false;
  return category === 'freezer' ? n > -18 : n > 4;
}

export function TemperatureLog({
  units,
  unit,
  year,
  onUnitsChange,
  onUnitChange,
  onYearChange,
}: {
  units: TemperatureUnit[];
  unit: string;
  year: number;
  onUnitsChange: (units: TemperatureUnit[]) => void;
  onUnitChange: (unit: string) => void;
  onYearChange: (year: number) => void;
}) {
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitCategory, setNewUnitCategory] = useState<TemperatureUnitCategory>('fridge');
  const [unitError, setUnitError] = useState('');
  const selected = units.find((option) => option.value === unit) ?? units[0] ?? TEMPERATURE_UNITS[0];
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [loadedKey, setLoadedKey] = useState('');
  const [editing, setEditing] = useState<{ key: string; draft: string } | null>(null);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const target = selected.category === 'freezer' ? '≤ -18°C' : '≤ 4°C';
  const storageKey = `${ENTRIES_STORAGE_PREFIX}:${selected.value}:${year}-${month + 1}`;

  useEffect(() => {
    setEditing(null);
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setEntries(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
    } catch {
      setEntries({});
    }
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {
      // storage unavailable
    }
  }, [entries, loadedKey, storageKey]);

  const openEditor = (key: string, value: string) => setEditing({ key, draft: value });
  const commit = () => {
    if (!editing) return;
    const value = editing.draft.trim();
    setEntries((prev) => {
      const next = { ...prev };
      if (value) next[editing.key] = value;
      else delete next[editing.key];
      return next;
    });
    setEditing(null);
  };

  const addUnit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newUnitName.trim();
    if (!name) {
      setUnitError('Enter a unit name.');
      return;
    }
    const normalizedName = name.toLocaleLowerCase();
    if (units.some((option) => [option.label, option.value].some((existing) => existing.toLocaleLowerCase() === normalizedName))) {
      setUnitError('A unit with this name already exists.');
      return;
    }
    const next = [...units, { value: name, label: name, category: newUnitCategory }];
    onUnitsChange(next);
    onUnitChange(name);
    setNewUnitName('');
    setUnitError('');
  };

  const deleteUnit = () => {
    if (units.length <= 1) return;
    const next = units.filter((option) => option.value !== selected.value);
    onUnitsChange(next);
    if (selected.value === unit) onUnitChange(next[0].value);
  };

  return (
    <section aria-labelledby="temperature-heading" className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="temperature-heading" className="text-xl font-bold text-foreground">Temperature Log</h2>
        <div className="flex items-center gap-2">
          <select aria-label="Temperature log" value={selected.value} onChange={(e) => onUnitChange(e.target.value)} className={SELECT_CLASSES}>
            {units.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ActionButton
            icon={<TrashIcon />}
            label={`Delete ${selected.label}`}
            variant="danger"
            disabled={units.length <= 1}
            onClick={deleteUnit}
          />
          <select aria-label="Year" value={year} onChange={(e) => onYearChange(Number(e.target.value))} className={SELECT_CLASSES}>
            {Array.from({ length: currentYear - 2019 }, (_, index) => currentYear - index).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
      <form onSubmit={addUnit} className="flex flex-wrap items-end gap-2" aria-label="Add temperature unit">
        <label className="grid gap-1 text-sm font-medium text-foreground">
          Unit name
          <input
            aria-label="Unit name"
            className={INPUT_CLASSES}
            maxLength={80}
            value={newUnitName}
            onChange={(event) => setNewUnitName(event.target.value)}
            placeholder="e.g. Walk-in fridge"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-foreground">
          Type
          <select
            aria-label="Unit type"
            className={SELECT_CLASSES}
            value={newUnitCategory}
            onChange={(event) => setNewUnitCategory(event.target.value as TemperatureUnitCategory)}
          >
            <option value="fridge">Fridge</option>
            <option value="freezer">Freezer</option>
          </select>
        </label>
        <ActionButton type="submit" icon={<PlusIcon />} label="Add unit" variant="primary" />
        {unitError && <p role="alert" className="basis-full text-sm text-danger">{unitError}</p>}
      </form>
      <div
        role="group"
        aria-label={`Temperature Log — ${selected.label}, ${year} (blank sheet)`}
        className="rounded-md border border-border bg-white"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-sm">
          <span className="font-semibold text-foreground">Daily Temperature Monitoring Log — {selected.label}</span>
          <select aria-label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className={SELECT_CLASSES}>
            {MONTHS.map((name, index) => (
              <option key={name} value={index}>{name} {year}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="bg-[#1b365d] text-white">
                <th scope="col" className="border border-border/40 px-2 py-2">Date</th>
                <th scope="col" className="border border-border/40 px-2 py-2">AM Temp<br />(Target {target})</th>
                <th scope="col" className="border border-border/40 px-2 py-2">AM Initials</th>
                <th scope="col" className="border border-border/40 px-2 py-2">PM Temp<br />(Target {target})</th>
                <th scope="col" className="border border-border/40 px-2 py-2">PM Initials</th>
                <th scope="col" className="border border-border/40 px-2 py-2">Corrective Actions / Comments<br />(If limits exceeded)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => (
                <tr key={day} className={day % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                  <th scope="row" className="border border-border px-2 py-2 text-left font-normal text-foreground">{day}</th>
                  {FIELDS.map((field) => {
                    const key = `${day}:${field.key}`;
                    const value = entries[key] ?? '';
                    const open = editing?.key === key;
                    const out = field.kind === 'temp' && isOutOfRange(value, selected.category);
                    return (
                      <td key={field.key} className="relative border border-border p-0">
                        <button
                          type="button"
                          aria-label={`${field.label} day ${day}`}
                          aria-haspopup="dialog"
                          aria-expanded={open}
                          onClick={() => openEditor(key, value)}
                          className={`block h-10 w-full px-2 text-left text-foreground hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary ${out ? 'font-semibold text-danger' : ''}`}
                        >
                          {value}{value && field.kind === 'temp' ? '°C' : ''}
                        </button>
                        {open && (
                          <form
                            role="dialog"
                            aria-label={`Edit ${field.label} day ${day}`}
                            onSubmit={(event) => { event.preventDefault(); commit(); }}
                            onKeyDown={(event) => { if (event.key === 'Escape') setEditing(null); }}
                            className="absolute left-0 top-full z-20 mt-1 flex w-56 items-center gap-1 rounded-md border bg-card p-2 shadow-lg"
                          >
                            <input
                              autoFocus
                              aria-label={field.label}
                              type={field.kind === 'temp' ? 'number' : 'text'}
                              step={field.kind === 'temp' ? '0.1' : undefined}
                              maxLength={field.kind === 'comment' ? 200 : field.kind === 'initials' ? 4 : undefined}
                              value={editing.draft}
                              onChange={(event) => setEditing({ key, draft: event.target.value })}
                              className={`${INPUT_CLASSES} min-w-0 flex-1`}
                            />
                            <ActionButton type="submit" icon={<CheckIcon />} label="Save" variant="primary" />
                            <ActionButton icon={<CloseIcon />} label="Cancel" onClick={() => setEditing(null)} />
                          </form>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
