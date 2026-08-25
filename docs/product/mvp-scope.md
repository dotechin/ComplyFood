# MVP Scope — ComplyFood

## English

### Purpose
This document defines the scope of the Minimum Viable Product (MVP) for ComplyFood. The MVP aims to deliver core HACCP compliance automation functionality that can be used, tested, and iterated upon quickly.

---

### User roles

| Role | Description |
|------|-------------|
| **Admin / Owner** | Full access: setup, configuration, all logs, reports, user management |
| **Staff member** | Daily operations: create and confirm entries, use override with reason |
| **Auditor / Consultant** | Read-only access to logs and reports (planned for a later phase) |

---

### Core modules

#### A. Authentication and access
- Email/password login and logout
- Role-based access control (RBAC)
- Password recovery flow
- Basic organization and user setup

#### B. Business setup
- Company name, address, operating category
- Location / site management
- Compliance profile configuration
- Working hours and schedule settings

#### C. Daily HACCP operations
- **Temperature logs** — equipment, storage, receiving
- **Cleaning / sanitation logs** — tasks, products, responsible person
- **Opening / closing checklists** — daily verification tasks
- **Supplier intake logs** — deliveries, lot numbers, temperature at arrival
- **Incident / anomaly logs** — non-conformities, corrective actions

#### D. Automation engine
- Preset values for recurring tasks (exact calibration to be defined later)
- Auto-generated daily forms based on business profile
- Scheduled reminders for pending tasks
- Default compliance templates by business type
- Recurrence rule configuration

#### E. Override system *(key MVP requirement)*
- Manual override of any preset or auto-generated value
- Mandatory reason / justification field
- Timestamp and user identification for every override
- Audit log: original value → overridden value, reason, user, time
- Optional approval workflow (post-MVP)

#### F. Reporting
- Daily and weekly compliance summaries
- Full compliance history with date and type filters
- Export to PDF and CSV
- Exception and override reports

#### G. Document storage
- Upload PDFs, images, and documents
- Store certificates, procedures, receipts, inspection files
- Link documents to specific logs, checklists, or incidents

---

### MVP boundaries (out of scope for v1)
- Multi-language UI (docs are bilingual; UI is English-first)
- Advanced rule engine calibration (framework is built; values TBD)
- Auditor / consultant portal
- Mobile offline mode
- Multi-tenant / SaaS billing
- Third-party integrations (ERP, supplier systems)

---

### Key MVP user flows

#### Flow 1 — Daily use
1. User logs in
2. Dashboard shows today's required tasks
3. System pre-fills standard values based on presets
4. User confirms entries or overrides values with a reason
5. Entries are saved with full audit history
6. Reports are available for review and export

#### Flow 2 — Override
1. System proposes a preset entry
2. User modifies a value
3. User enters a mandatory reason
4. System records: original value, new value, user, timestamp
5. Entry remains fully traceable in audit log

#### Flow 3 — Compliance review
1. Admin opens the reports section
2. Filters by date range, location, or task type
3. Downloads PDF or CSV
4. Reviews exceptions and override history

---

## Italiano

### Scopo
Questo documento definisce l'ambito del Prodotto Minimo Funzionante (MVP) di ComplyFood. L'MVP mira a fornire le funzionalità principali di automazione della conformità HACCP, pronte per essere utilizzate, testate e migliorate rapidamente.

---

### Ruoli utente

| Ruolo | Descrizione |
|-------|-------------|
| **Admin / Titolare** | Accesso completo: configurazione, tutti i log, report, gestione utenti |
| **Operatore** | Operazioni quotidiane: creare e confermare registrazioni, usare l'override con motivazione |
| **Revisore / Consulente** | Accesso in sola lettura a log e report (pianificato per una fase successiva) |

---

### Moduli principali

#### A. Autenticazione e accessi
- Login e logout tramite email/password
- Controllo degli accessi basato sui ruoli (RBAC)
- Flusso di recupero password
- Configurazione di base di organizzazione e utenti

#### B. Configurazione aziendale
- Ragione sociale, indirizzo, categoria di attività
- Gestione sedi / punti vendita
- Configurazione del profilo di conformità
- Orari di lavoro e impostazioni del calendario

#### C. Operazioni HACCP quotidiane
- **Registrazioni temperature** — attrezzature, stoccaggio, ricevimento
- **Registrazioni pulizie / sanificazione** — attività, prodotti, responsabile
- **Checklist apertura / chiusura** — verifiche giornaliere
- **Registrazioni entrata merce** — consegne, numeri di lotto, temperatura all'arrivo
- **Registrazioni incidenti / anomalie** — non conformità, azioni correttive

#### D. Motore di automazione
- Valori preset per attività ricorrenti (calibrazione esatta da definire in seguito)
- Moduli giornalieri generati automaticamente in base al profilo aziendale
- Promemoria programmati per attività in sospeso
- Modelli di conformità predefiniti per tipologia di attività
- Configurazione delle regole di ricorrenza

#### E. Sistema di override *(requisito chiave dell'MVP)*
- Override manuale di qualsiasi valore preset o generato automaticamente
- Campo motivazione / giustificazione obbligatorio
- Data, ora e identificazione utente per ogni override
- Audit log: valore originale → valore modificato, motivazione, utente, orario
- Flusso di approvazione opzionale (post-MVP)

#### F. Report
- Sommari di conformità giornalieri e settimanali
- Storico completo della conformità con filtri per data e tipo
- Esportazione in PDF e CSV
- Report sulle eccezioni e sugli override

#### G. Archiviazione documenti
- Caricamento di PDF, immagini e documenti
- Archiviazione di certificati, procedure, ricevute, verbali di ispezione
- Collegamento dei documenti a log, checklist o incidenti specifici

---

### Confini dell'MVP (fuori scope per la v1)
- UI multilingua (i doc sono bilingui; l'interfaccia è in inglese nella prima versione)
- Calibrazione avanzata del motore di regole (la struttura è prevista; i valori da definire)
- Portale revisore / consulente
- Modalità offline per mobile
- Multi-tenant / fatturazione SaaS
- Integrazioni con sistemi di terze parti (ERP, sistemi fornitori)

---

### Flussi utente principali dell'MVP

#### Flusso 1 — Uso quotidiano
1. L'utente effettua il login
2. La dashboard mostra le attività richieste per oggi
3. Il sistema pre-compila i valori standard in base ai preset
4. L'utente conferma le registrazioni o le modifica con una motivazione
5. Le registrazioni vengono salvate con lo storico completo
6. I report sono disponibili per la revisione e l'esportazione

#### Flusso 2 — Override
1. Il sistema propone una registrazione preset
2. L'utente modifica un valore
3. L'utente inserisce una motivazione obbligatoria
4. Il sistema registra: valore originale, nuovo valore, utente, data e ora
5. La registrazione rimane completamente tracciabile nell'audit log

#### Flusso 3 — Revisione della conformità
1. L'admin apre la sezione report
2. Filtra per intervallo di date, sede o tipo di attività
3. Scarica in PDF o CSV
4. Revisiona le eccezioni e lo storico degli override
