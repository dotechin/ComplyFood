import { LogType } from '@complyfood/shared';
import { WeeklyTickSheet, type WeeklyTickSheetProps } from './weekly-tick-sheet';

export const CHECKLIST_ITEM_FIELD = 'Check';
export const CHECKLIST_DATE_FIELD = 'Check date';

export const CHECKLIST_SECTIONS = [
  {
    title: 'Opening checks',
    items: [
      { check: 'Staff fitness to work', standard: 'No symptoms of illness reported; cuts covered with blue detectable plasters.' },
      { check: 'Personal hygiene & clothing', standard: 'Clean uniform, hair covered, no jewellery; hands washed on entry.' },
      { check: 'Handwash stations', standard: 'Hot water, liquid soap and paper towels available at every basin.' },
      { check: 'Fridges & freezers', standard: 'Chilled ≤ 4°C, frozen ≤ -18°C; readings recorded in the Temperature Log.' },
      { check: 'Food storage', standard: 'Covered, labelled and dated; raw stored below ready-to-eat; FIFO respected.' },
      { check: 'Pest control', standard: 'No signs of pests; doors, screens and bait points intact.' },
    ],
  },
  {
    title: 'Closing checks',
    items: [
      { check: 'Food put away', standard: 'Leftovers cooled, covered, labelled and refrigerated; out-of-date stock discarded.' },
      { check: 'Surfaces & equipment', standard: 'Cleaned and disinfected per the Cleaning & Disinfection Schedule.' },
      { check: 'Waste', standard: 'Bins emptied, lids closed, waste area clean.' },
      { check: 'Allergen information', standard: 'Allergen matrix (Reg. (EU) 1169/2011) current for tomorrow’s menu.' },
    ],
  },
] as const;

export function HygieneChecklist(props: WeeklyTickSheetProps) {
  return (
    <WeeklyTickSheet
      {...props}
      id="checklist"
      title="Daily Opening & Closing Hygiene Checklist"
      description={<><span className="font-semibold">Instructions:</span> tick each day once the check is satisfied; record any failure in the Corrective Action &amp; Deviation Log.</>}
      sheetTitle="Weekly Hygiene Checklist"
      logType={LogType.CHECKLIST}
      rowField={CHECKLIST_ITEM_FIELD}
      dateField={CHECKLIST_DATE_FIELD}
      columns={[{ label: 'Check' }, { label: 'Standard / Requirement' }]}
      sections={CHECKLIST_SECTIONS.map((section) => ({
        title: section.title,
        rows: section.items.map((item) => ({ key: item.check, header: item.check, cells: [item.standard] })),
      }))}
      footnote="Tick a day once the check is satisfied. Closed days are greyed out. Pending ticks can be undone until they are confirmed."
    />
  );
}
