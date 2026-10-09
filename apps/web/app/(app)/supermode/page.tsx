export default function SupermodePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Supermode</h1>
        <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-warning">
          Under construction
        </span>
      </div>
      <section className="rounded-lg border border-dashed bg-card p-10 text-center shadow-card">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-warning" aria-hidden="true">
          <path d="M2 20h20M5 20V9l7-5 7 5v11M9 20v-6h6v6" />
        </svg>
        <h2 className="mt-3 text-lg font-semibold text-foreground">This page is being redesigned</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Creating entries, documents and checklists by typing JSON has been removed. A guided, form-based editor will replace it.
        </p>
      </section>
    </div>
  );
}
