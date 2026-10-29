import type { ReactNode } from 'react';
import { LogStatus, type LogEntry, type LogType } from '@complyfood/shared';
import { ActionButton, ChevronLeftIcon, ChevronRightIcon } from '../../../components/icon-button';
import { OpeningDaysPicker, WEEKDAY_LONG, WEEKDAY_SHORT, useOpeningDays } from './opening-days';

/** Monday (UTC calendar date) of the week containing `date`. */
export function weekStartOf(date: Date) {
  const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Today's local calendar date as YYYY-MM-DD. */
export function todayIso(now = new Date()) {
  return isoDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export type TickSheetColumn = { label: ReactNode; className?: string };
export type TickSheetRow = { key: string; header: ReactNode; cells: ReactNode[] };
export type TickSheetSection = { title?: string; rows: TickSheetRow[] };

export type WeeklyTickSheetProps = {
  logs: LogEntry[];
  weekStart: Date;
  today: string;
  busyKey: string | null;
  onWeekChange: (weekStart: Date) => void;
  onTick: (rowKey: string, date: string) => void;
  onUndo: (entry: LogEntry) => void;
};

export function WeeklyTickSheet({
  id,
  title,
  description,
  sheetTitle,
  logType,
  rowField,
  dateField,
  columns,
  sections,
  footnote,
  logs,
  weekStart,
  today,
  busyKey,
  onWeekChange,
  onTick,
  onUndo,
}: WeeklyTickSheetProps & {
  id: string;
  title: string;
  description?: ReactNode;
  sheetTitle: string;
  logType: LogType;
  rowField: string;
  dateField: string;
  columns: TickSheetColumn[];
  sections: TickSheetSection[];
  footnote: string;
}) {
  const { openingDays, toggle } = useOpeningDays();
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setUTCDate(weekStart.getUTCDate() + index);
    const weekday = day.getUTCDay();
    return { date: isoDate(day), dayOfMonth: day.getUTCDate(), weekday, isOpen: openingDays.includes(weekday) };
  });

  const ticks = new Map<string, LogEntry>();
  for (const log of logs) {
    if (log.type !== logType || log.status === LogStatus.OVERRIDDEN) continue;
    const row = log.fields?.[rowField];
    const date = log.fields?.[dateField];
    if (typeof row !== 'string' || typeof date !== 'string') continue;
    const key = `${row}|${date}`;
    const existing = ticks.get(key);
    if (!existing || existing.status !== LogStatus.CONFIRMED) ticks.set(key, log);
  }

  const shiftWeek = (weeks: number) => {
    const next = new Date(weekStart);
    next.setUTCDate(weekStart.getUTCDate() + weeks * 7);
    onWeekChange(next);
  };
  const formatDay = (date: string, withYear: boolean) =>
    new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    });
  const weekLabel = `${formatDay(days[0].date, false)} – ${formatDay(days[6].date, true)}`;
  const totalColumns = columns.length + days.length;
  let rowIndex = 0;

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
      <div>
        <h2 id={`${id}-heading`} className="text-xl font-bold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-foreground">{description}</p>}
      </div>
      <div role="group" aria-label={`${sheetTitle} — week ${weekLabel}`} className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2 text-sm">
          <span className="font-semibold text-foreground">{sheetTitle}</span>
          <div className="flex items-center gap-2 print:hidden">
            <ActionButton icon={<ChevronLeftIcon />} label="Previous week" onClick={() => shiftWeek(-1)} />
            <span className="min-w-40 text-center font-medium tabular-nums text-foreground">{weekLabel}</span>
            <ActionButton icon={<ChevronRightIcon />} label="Next week" disabled={days[6].date >= today} onClick={() => shiftWeek(1)} />
          </div>
        </div>
        <OpeningDaysPicker openingDays={openingDays} onToggle={toggle} />
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-left text-sm" aria-label={title}>
            <thead>
              <tr className="bg-primary text-primary-foreground">
                {columns.map((column, index) => (
                  <th key={index} scope="col" className={`border border-primary-foreground/20 px-3 py-2 text-center font-semibold ${column.className ?? ''}`}>
                    {column.label}
                  </th>
                ))}
                {days.map(({ date, dayOfMonth, weekday, isOpen }) => (
                  <th
                    key={date}
                    scope="col"
                    aria-current={date === today ? 'date' : undefined}
                    className={`w-12 border border-primary-foreground/20 px-1 py-1.5 text-center font-semibold ${
                      isOpen ? '' : 'bg-muted text-muted-foreground'
                    } ${date === today ? 'underline decoration-2 underline-offset-4' : ''}`}
                  >
                    <abbr title={`${WEEKDAY_LONG[weekday]} ${date}${isOpen ? '' : ' (closed)'}`} className="block no-underline">
                      {WEEKDAY_SHORT[weekday]}
                    </abbr>
                    <span className="block text-xs font-normal tabular-nums">{String(dayOfMonth).padStart(2, '0')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            {sections.map((section, sectionIndex) => (
              <tbody key={section.title ?? sectionIndex}>
                {section.title && (
                  <tr>
                    <th scope="rowgroup" colSpan={totalColumns} className="border border-border bg-accent px-3 py-1.5 text-left font-semibold text-accent-foreground">
                      {section.title}
                    </th>
                  </tr>
                )}
                {section.rows.map((row) => {
                  const striped = rowIndex++ % 2 === 1;
                  return (
                    <tr key={row.key} className={striped ? 'bg-accent/30' : 'bg-card'}>
                      <th scope="row" className="border border-border px-3 py-3 align-top font-semibold text-foreground">{row.header}</th>
                      {row.cells.map((cell, index) => (
                        <td key={index} className="border border-border px-3 py-3 align-top text-foreground">{cell}</td>
                      ))}
                      {days.map(({ date, weekday, isOpen }) => {
                        const key = `${row.key}|${date}`;
                        const entry = ticks.get(key);
                        const label = `${row.key} — ${WEEKDAY_LONG[weekday]} ${date}`;
                        const locked = entry && entry.status !== LogStatus.PENDING;
                        const future = date > today;
                        const ariaLabel = !isOpen
                          ? `${label}: closed`
                          : entry
                            ? `${label}: done${locked ? '' : ' (pending review, click to undo)'}`
                            : `${label}: mark as done`;
                        return (
                          <td key={date} className={`border border-border p-0 text-center align-middle ${isOpen ? '' : 'bg-muted'}`}>
                            <button
                              type="button"
                              disabled={!isOpen || future || busyKey === key || Boolean(locked)}
                              aria-pressed={Boolean(entry)}
                              aria-label={ariaLabel}
                              onClick={() => (entry ? onUndo(entry) : onTick(row.key, date))}
                              className={`flex h-14 w-full items-center justify-center text-base font-bold transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary disabled:cursor-not-allowed ${
                                !isOpen
                                  ? 'text-muted-foreground'
                                  : entry
                                    ? locked
                                      ? 'text-primary'
                                      : 'text-primary/60 hover:bg-danger/10'
                                    : future
                                      ? 'bg-muted/60'
                                      : 'hover:bg-primary/10'
                              }`}
                            >
                              {entry ? '✓' : ''}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{footnote}</p>
    </section>
  );
}
