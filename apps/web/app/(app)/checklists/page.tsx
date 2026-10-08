'use client';

import { ActionButton, PrintIcon } from '../../../components/icon-button';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const CHECKLIST_SECTIONS = [
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

export default function ChecklistsPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Checklists</h1>
          <p className="text-sm text-muted-foreground">Daily prerequisite hygiene checklist.</p>
        </div>
        <ActionButton icon={<PrintIcon />} label="Print checklist" onClick={() => window.print()} />
      </div>

      <section aria-labelledby="checklist-heading" className="space-y-3 rounded-lg border bg-card p-4 shadow-card">
        <div>
          <h2 id="checklist-heading" className="text-xl font-bold text-foreground">Daily Opening &amp; Closing Hygiene Checklist</h2>
          <p className="mt-1 text-sm text-foreground">
            <span className="font-semibold">Instructions:</span> tick each day once the check is satisfied; record any failure in the Corrective Action &amp; Deviation Log.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm" aria-label="Daily Opening & Closing Hygiene Checklist">
            <thead className="bg-sidebar text-white">
              <tr>
                <th scope="col" className="border border-border px-3 py-2 text-center font-semibold">Check</th>
                <th scope="col" className="border border-border px-3 py-2 text-center font-semibold">Standard / Requirement</th>
                {DAYS.map((day, index) => (
                  <th key={index} scope="col" className="w-10 border border-border px-1 py-2 text-center font-semibold">{day}</th>
                ))}
              </tr>
            </thead>
            {CHECKLIST_SECTIONS.map((section) => (
              <tbody key={section.title}>
                <tr>
                  <th scope="rowgroup" colSpan={2 + DAYS.length} className="border border-border bg-accent px-3 py-1.5 text-left font-semibold text-accent-foreground">
                    {section.title}
                  </th>
                </tr>
                {section.items.map((item, index) => (
                  <tr key={item.check} className={index % 2 ? 'bg-muted/40' : ''}>
                    <th scope="row" className="border border-border px-3 py-3 align-top font-semibold text-foreground">{item.check}</th>
                    <td className="border border-border px-3 py-3 align-top text-foreground">{item.standard}</td>
                    {DAYS.map((_, dayIndex) => (
                      <td key={dayIndex} className="h-12 border border-border" />
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <div className="grid gap-3 pt-2 text-sm text-foreground sm:grid-cols-2">
          <p>Week commencing: <span className="inline-block w-40 border-b border-border" /></p>
          <p>Manager sign-off: <span className="inline-block w-40 border-b border-border" /></p>
        </div>
      </section>
    </div>
  );
}
