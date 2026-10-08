const LEGAL_BASIS = [
  { ref: 'Regulation (EC) No 852/2004', text: 'General hygiene of foodstuffs; Article 5 requires permanent procedures based on HACCP principles.' },
  { ref: 'Regulation (EU) 2021/382', text: 'Amends Annex II of 852/2004: allergen management, redistribution of food and food safety culture.' },
  { ref: 'Regulation (EC) No 178/2002', text: 'General Food Law: food business operator responsibility and one-step-back / one-step-forward traceability.' },
  { ref: 'Regulation (EU) No 1169/2011', text: 'Food information to consumers, including the 14 allergens for non-prepacked food.' },
  { ref: 'Codex Alimentarius CXC 1-1969', text: 'General Principles of Food Hygiene — prerequisite programmes and the HACCP system.' },
];

const PRINCIPLES = [
  'Conduct a hazard analysis and identify control measures.',
  'Determine the critical control points (CCPs).',
  'Establish validated critical limits.',
  'Establish a system to monitor control of the CCPs.',
  'Establish corrective actions when monitoring shows a deviation.',
  'Validate the plan and establish verification procedures.',
  'Establish documentation and record keeping.',
];

const CRITICAL_LIMITS = [
  { point: 'Chilled storage', limit: '≤ 4°C', record: 'Temperature Log' },
  { point: 'Frozen storage', limit: '≤ -18°C', record: 'Temperature Log' },
  { point: 'Cooking (core)', limit: '≥ 75°C for 30 s', record: 'Temperature Log' },
  { point: 'Hot holding', limit: '≥ 63°C', record: 'Temperature Log' },
  { point: 'Goods receipt (chilled)', limit: '≤ 5°C on delivery', record: 'Goods Receipt' },
];

const RECORDS = [
  { name: 'Goods Receipt', href: '/logs', text: 'Supplier, product, batch and delivery temperature.' },
  { name: 'Temperature Log', href: '/logs', text: 'Daily readings for every fridge, freezer and hot-holding unit.' },
  { name: 'Cleaning & Disinfection Schedule', href: '/logs', text: 'Areas, frequency, method, chemicals and responsibility.' },
  { name: 'Corrective Action & Deviation Log', href: '/logs', text: 'Deviations, immediate correction, product disposition and prevention.' },
  { name: 'Daily Hygiene Checklist', href: '/checklists', text: 'Opening and closing prerequisite checks.' },
];

export function HaccpPackage() {
  return (
    <section aria-labelledby="package-heading" className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-card">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bar · Pastry · Restaurant</p>
        <h2 id="package-heading" className="text-xl font-bold text-foreground">HACCP European Compliance Package</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The records below make up the food safety management system expected by EU food hygiene law. Keep them complete, signed and available for official controls.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Legal basis</h3>
          <dl className="space-y-2 text-sm">
            {LEGAL_BASIS.map((item) => (
              <div key={item.ref} className="rounded-md border border-border bg-muted/30 p-3">
                <dt className="font-medium text-foreground">{item.ref}</dt>
                <dd className="mt-0.5 text-xs text-muted-foreground">{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">The 7 HACCP principles</h3>
          <ol className="space-y-2 text-sm">
            {PRINCIPLES.map((principle, index) => (
              <li key={principle} className="flex gap-3 rounded-md border border-border bg-muted/30 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sidebar text-xs font-semibold text-white">{index + 1}</span>
                <span className="text-foreground">{principle}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Critical limits</h3>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-sidebar text-white">
              <tr>
                <th scope="col" className="border border-border px-3 py-2 font-semibold">Control point</th>
                <th scope="col" className="border border-border px-3 py-2 font-semibold">Critical limit</th>
                <th scope="col" className="border border-border px-3 py-2 font-semibold">Record</th>
              </tr>
            </thead>
            <tbody>
              {CRITICAL_LIMITS.map((row, index) => (
                <tr key={row.point} className={index % 2 ? 'bg-muted/40' : ''}>
                  <th scope="row" className="border border-border px-3 py-2 font-medium text-foreground">{row.point}</th>
                  <td className="border border-border px-3 py-2 tabular-nums text-foreground">{row.limit}</td>
                  <td className="border border-border px-3 py-2 text-muted-foreground">{row.record}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Package records</h3>
          <ul className="space-y-2 text-sm">
            {RECORDS.map((record) => (
              <li key={record.name}>
                <a href={record.href} className="block rounded-md border border-border bg-muted/30 p-3 transition hover:border-primary/40 hover:bg-accent">
                  <span className="font-medium text-foreground">{record.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{record.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
