import { useState } from 'react';
import { ActionButton, PlusIcon, TrashIcon } from '../../../components/icon-button';

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
        role="img"
        aria-label={`Temperature Log — ${selected.label}, ${year} (blank sheet)`}
        className="flex min-h-[28rem] flex-col rounded-md border border-border bg-white"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2 text-sm">
          <span className="font-semibold text-foreground">{selected.label}</span>
          <span className="text-muted-foreground">{year}</span>
        </div>
        <div className="flex-1" />
      </div>
    </section>
  );
}
