import { LogType } from '@complyfood/shared';
import { WeeklyTickSheet, type WeeklyTickSheetProps } from './weekly-tick-sheet';

export { isoDate, todayIso, weekStartOf } from './weekly-tick-sheet';

export const CLEANING_AREA_FIELD = 'Area / Item';
export const CLEANING_DATE_FIELD = 'Cleaning date';

export const CLEANING_SCHEDULE = [
  {
    area: 'Espresso Steam Wands / Bar Counters',
    frequency: 'D',
    method: 'Purge steam wand after every use. Wipe with food-safe sanitizer (EN 1276).',
    responsibility: 'Barista',
  },
  {
    area: 'Pastry Work Surfaces & Mixers',
    frequency: 'D / Shift',
    method: 'Scrape residues, wash with hot detergent, rinse, apply surface disinfectant.',
    responsibility: 'Pastry Chef',
  },
  {
    area: 'Cooking Line Equipment (Grills, Ovens)',
    frequency: 'D',
    method: 'Degrease surfaces using heavy-duty cleaner, rinse with clean water.',
    responsibility: 'Kitchen Porter',
  },
  {
    area: 'Refrigerators & Walk-in Floors',
    frequency: 'W',
    method: 'Empty unit, wipe interior shelves with sanitizing solution. Mop floors.',
    responsibility: 'Kitchen Staff',
  },
  {
    area: 'Ice Machine (Bar)',
    frequency: 'M',
    method: 'Empty completely, descale, treat with anti-microbial sanitizing flush.',
    responsibility: 'Bar Supervisor',
  },
  {
    area: 'Handwash Stations & Soap Dispensers',
    frequency: 'D',
    method: 'Sanitize splashbacks, taps, and handles. Replenish soap and paper towels.',
    responsibility: 'All Staff',
  },
] as const;

export function CleaningSchedule(props: WeeklyTickSheetProps) {
  return (
    <WeeklyTickSheet
      {...props}
      id="cleaning"
      title="Cleaning & Disinfection Schedule"
      description={<><span className="font-semibold">Frequency Legend:</span> D = Daily, W = Weekly, M = Monthly, TW = Twice Weekly</>}
      sheetTitle="Weekly Cleaning Record"
      logType={LogType.CLEANING}
      rowField={CLEANING_AREA_FIELD}
      dateField={CLEANING_DATE_FIELD}
      columns={[
        { label: 'Area / Item' },
        { label: 'Freq.', className: 'px-2' },
        { label: 'Cleaning Method & Chemicals Used' },
        { label: 'Responsibility' },
      ]}
      sections={[{
        rows: CLEANING_SCHEDULE.map((row) => ({
          key: row.area,
          header: row.area,
          cells: [row.frequency, row.method, row.responsibility],
        })),
      }]}
      footnote="Tick a day once the task is completed. Closed days are greyed out. Pending ticks can be undone until they are confirmed."
    />
  );
}
