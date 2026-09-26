'use client';

import { useEffect, useState } from 'react';

interface RegionValidity {
  region: string;
  validity: string;
  note?: string;
}

interface RegulationNote {
  title: string;
  summary: string;
  points: string[];
  reference?: { label: string; href: string };
  regionsTitle?: string;
  regions?: RegionValidity[];
}

const EU_REFERENCES = [
  {
    label: 'EU food hygiene overview',
    description: 'European Commission — biological safety and food hygiene framework.',
    href: 'https://food.ec.europa.eu/food-safety/biological-safety/food-hygiene_en',
    type: 'link' as const,
  },
  {
    label: 'Food hygiene factsheet (PDF)',
    description: 'Campaign 26 factsheet on food hygiene — official downloadable document.',
    href: 'https://food.ec.europa.eu/document/download/ddb00f41-617b-4e92-9e75-9dd531721c20_en?filename=campaign-26_factsheet_food-hygiene.pdf',
    type: 'download' as const,
  },
];

const REGULATION_NOTES: Record<string, RegulationNote> = {
  en: {
    title: 'European Union — general framework',
    summary:
      'Food business operators across the EU follow the same hygiene package, with HACCP-based self-checking at its core.',
    points: [
      'Regulation (EC) 852/2004 sets the general hygiene rules for all food businesses.',
      'HACCP principles (Codex Alimentarius) underpin the mandatory self-checking plan.',
      'National competent authorities handle registration, approval and official controls.',
    ],
  },
  it: {
    title: 'Italia — validità regione per regione',
    summary:
      'In Italia la registrazione sanitaria e la validità delle autorizzazioni sono disciplinate a livello regionale: i periodi di validità e i rinnovi cambiano da regione a regione.',
    points: [
      'La notifica (SCIA) si presenta allo Sportello Unico (SUAP) e viene trasmessa alla ASL competente.',
      'I periodi di validità e i rinnovi delle autorizzazioni sanitarie variano per regione.',
      'Il piano di autocontrollo HACCP è obbligatorio ai sensi del Reg. (CE) 852/2004.',
      'Gli attestati di formazione degli alimentaristi (ex libretto sanitario) seguono scadenze regionali.',
    ],
    reference: {
      label: 'Ministero della Salute — Sicurezza alimentare',
      href: 'https://www.salute.gov.it/portale/sicurezzaalimentare/homeSicurezzaAlimentare.jsp',
    },
    regionsTitle: 'Validità formazione alimentaristi (indicativa)',
    regions: [
      { region: 'Lombardia', validity: '3 anni', note: 'Rinnovo con aggiornamento periodico' },
      { region: 'Lazio', validity: '4 anni', note: 'Attestato HACCP addetti' },
      { region: 'Emilia-Romagna', validity: '3 anni', note: 'Formazione a cura dell’OSA' },
      { region: 'Veneto', validity: '3 anni', note: 'Aggiornamento a cura dell’azienda' },
      { region: 'Piemonte', validity: '3 anni', note: 'Attestato addetti non responsabili' },
      { region: 'Toscana', validity: '3 anni', note: 'Rinnovo con corso di aggiornamento' },
      { region: 'Sicilia', validity: '3 anni', note: 'Attestato regionale' },
      { region: 'Campania', validity: '4 anni', note: 'Attestato addetti' },
    ],
  },
  es: {
    title: 'España — marco autonómico',
    summary:
      'El registro sanitario y los controles se gestionan a través de las comunidades autónomas, con plazos de validez que pueden variar.',
    points: [
      'Inscripción en el Registro General Sanitario de Empresas Alimentarias (RGSEAA).',
      'Las comunidades autónomas realizan los controles oficiales.',
      'El plan APPCC (HACCP) es obligatorio según el Reg. (CE) 852/2004.',
    ],
  },
  fr: {
    title: 'France — cadre national',
    summary:
      'La déclaration d’activité et les contrôles relèvent des autorités nationales et départementales.',
    points: [
      'Déclaration auprès de la DDPP/DDETSPP du département.',
      'Le plan de maîtrise sanitaire (PMS) intègre les principes HACCP.',
      'Règlement (CE) 852/2004 applicable à tous les exploitants.',
    ],
  },
  de: {
    title: 'Deutschland — Länderebene',
    summary:
      'Registrierung und amtliche Kontrollen erfolgen über die zuständigen Behörden der Bundesländer.',
    points: [
      'Registrierung beim örtlichen Lebensmittelüberwachungsamt.',
      'HACCP-basiertes Eigenkontrollkonzept ist verpflichtend.',
      'Verordnung (EG) 852/2004 gilt für alle Lebensmittelunternehmer.',
    ],
  },
  pt: {
    title: 'Portugal — quadro nacional',
    summary:
      'O registo e os controlos oficiais são assegurados pelas autoridades nacionais competentes.',
    points: [
      'Registo da atividade junto das autoridades competentes (ASAE/DGAV).',
      'O plano HACCP de autocontrolo é obrigatório.',
      'Regulamento (CE) 852/2004 aplicável a todos os operadores.',
    ],
  },
};

export function ComplianceSection() {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const stored =
      typeof window !== 'undefined' ? window.localStorage.getItem('complyfood-language') : null;
    if (stored) setLanguage(stored);
  }, []);

  const note = REGULATION_NOTES[language] ?? REGULATION_NOTES.en;

  return (
    <section className="rounded-lg border border-border bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
        </span>
        <h2 className="text-base font-semibold text-foreground">European law compliance</h2>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Official references</h3>
          <ul className="space-y-2.5">
            {EU_REFERENCES.map((ref) => (
              <li key={ref.href}>
                <a
                  href={ref.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3.5 transition hover:border-primary/40 hover:bg-accent"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {ref.type === 'download' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      {ref.label}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {ref.type === 'download' ? 'PDF' : 'EU'}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{ref.description}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Regional regulation</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {language}
            </span>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <p className="font-medium text-foreground">{note.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note.summary}</p>
            <ul className="mt-3 space-y-2">
              {note.points.map((point) => (
                <li key={point} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-primary" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {note.regions && note.regions.length > 0 ? (
              <div className="mt-4">
                {note.regionsTitle ? (
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {note.regionsTitle}
                  </p>
                ) : null}
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-muted/60 text-muted-foreground">
                        <th className="px-3 py-2 font-semibold">Regione</th>
                        <th className="px-3 py-2 font-semibold">Validità</th>
                        <th className="hidden px-3 py-2 font-semibold sm:table-cell">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {note.regions.map((row) => (
                        <tr key={row.region} className="border-t border-border">
                          <td className="px-3 py-2 font-medium text-foreground">{row.region}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.validity}</td>
                          <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{row.note ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Valori indicativi: verificare sempre la normativa regionale vigente e i regolamenti ASL locali.
                </p>
              </div>
            ) : null}

            {note.reference ? (
              <a
                href={note.reference.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
                {note.reference.label}
              </a>
            ) : null}

            <p className="mt-3 text-[11px] text-muted-foreground">
              Regulation shown for the language selected in Settings. Change your language to see the matching national guidance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
