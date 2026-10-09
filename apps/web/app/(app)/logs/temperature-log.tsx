export const TEMPERATURE_UNITS = [
  { value: 'Banco Refrigerato Bar (n.1)', label: 'Bar counter 1' },
  { value: 'Banco Refrigerato Bar (n.2)', label: 'Bar counter 2' },
  { value: 'Banco Refrigerato Bar (n.3)', label: 'Bar counter 3' },
  { value: 'Pozzetto Freezer Cucina (n.4)', label: 'Kitchen chest freezer 4' },
] as const;

const SELECT_CLASSES = 'h-9 rounded-md border border-input bg-card px-3 text-sm text-foreground';

/** One Temperature Log sheet; the selector chooses which unit's log is shown. The sheet layout is being redesigned. */
export function TemperatureLog({
  unit,
  year,
  onUnitChange,
  onYearChange,
}: {
  unit: string;
  year: number;
  onUnitChange: (unit: string) => void;
  onYearChange: (year: number) => void;
}) {
  const selected = TEMPERATURE_UNITS.find((option) => option.value === unit) ?? TEMPERATURE_UNITS[0];
  const currentYear = new Date().getFullYear();

  return (
    <section aria-labelledby="temperature-heading" className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="temperature-heading" className="text-xl font-bold text-foreground">Temperature Log</h2>
        <div className="flex items-center gap-2">
          <select aria-label="Temperature log" value={selected.value} onChange={(e) => onUnitChange(e.target.value)} className={SELECT_CLASSES}>
            {TEMPERATURE_UNITS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select aria-label="Year" value={year} onChange={(e) => onYearChange(Number(e.target.value))} className={SELECT_CLASSES}>
            {Array.from({ length: currentYear - 2019 }, (_, index) => currentYear - index).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
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
