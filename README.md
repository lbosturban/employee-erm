# Contacts ERM

An enterprise-grade, fully local CRM/ERM workbench for managing contacts, the companies they
belong to, and the classifications that organize them — built with **Angular 22** and
**TypeScript (strict mode)**.

It runs entirely in the browser: **no backend, no database** — all data is persisted in
`localStorage` behind a swappable persistence layer. The codebase is already structured for the
next phase of the product: an **Employee Relationship Management (ERM)** and legal-risk platform,
whose future modules (Cases, Escalations, Threat Assessments, Legal Elements) will plug into any
contact via its `contactId` without rewriting what exists today.

## Project Description

### Phase 1 — Contact CRM (current)

- **Contacts** — full CRUD with a dual-mode name model: enter a direct full name *or* a
  structured breakdown honoring international naming conventions (titles, multiple middle names,
  western/eastern/custom token order). Strict validators for email (RFC-5322), phone
  (E.164-range with extensions) and every other field.
- **Companies** — CRM-managed company registry with size (Self-Employed → Major Enterprise),
  business structure (Individual, Sole Proprietorship, Partnership, LLC, Corporation), sector,
  and a CEO link to any contact. Modal CRUD with duplicate detection and delete protection while
  contacts still reference the company.
- **Categories** — color-coded, bilingual (EN/FR) classifications with per-category contact
  counts and delete protection while contacts are assigned.
- **HR lifecycle** — every contact carries an `hrProcessStatus`
  (`Pending` / `Active` / `Inactive` / `Archived`) and a per-company `Active`/`Inactive` flag,
  both filterable in the directory and surfaced as badges and dashboard KPIs.
- **Dashboard** — KPIs for totals (contacts, companies, categories, favorites), company-active
  vs. inactive breakdown, HR lifecycle breakdown and recent additions.
- **Directory UX** — toggleable card/table views, local pagination, token-aware search by name,
  filters (category, HR status, company Active/Inactive, favorites only) and sorting
  (name A–Z / Z–A, newest / oldest).
- **Favorites** — dedicated starred-contacts view, toggleable from anywhere.
- **Quick search** — debounced header search with an accessible combobox/listbox dropdown;
  `Enter` jumps to the first match.
- **Data portability** — JSON full-database export/import (per-entity schema validation, id
  uniqueness and foreign-key integrity checks) and **vCard 4.0** support: export any contact
  individually or import a `.vcf` file from the header, re-attaching known categories by name.
- **i18n & theming** — reactive FR/EN switcher (dictionary-backed pipe) and a persisted
  Light/Dark theme.
- **Safety rails** — unsaved-changes guard on all forms, confirmation dialogs on every
  destructive action, and resolvers that redirect gracefully on unknown ids.

Deleting a category or company is blocked while contacts still reference it, with a clear error
message. Sample data (9 contacts, 7 companies, 4 categories) is seeded on first run so the layout
can be appreciated immediately.

### Phase 2 — ERM & legal-risk platform (current)

The brand in the header **switches automatically with the product line**: navigating to any
`/erm/*` section swaps the logo (`connects-erm.svg`) and the title to **"Connects ERM"**; any
Phase-1 navigation switches back to **"Contacts ERM"** (`contacts-erm.svg`). The tagline stays
shared. The `connects-erm.svg` file is clearly-marked placeholder art until the final logo
replaces it under the same filename.

The four sidebar ERM entries are live, lazy-loaded routes under `/erm`:

- **Cases** (`/erm/cases`) — workplace **irritants, conflicts, complaints and mediations**
  attached to any number of contacts (checkbox picker, at least one required) with an optional
  company link and a lifecycle status (`Open` → `Observed` → `Resolved`). Kind/status filters,
  modal CRUD, confirm-dialog deletion, dangling contact ids rendered as "(unknown contact)".
- **Escalations** (`/erm/escalations`) — hierarchical steps on the ladder
  **Superiors → Management → HR → Legal Department**, from a *source* contact to a *target*
  contact (a group validator refuses when the two are identical), a **purpose** classification
  (information, protection, resolution, sanction, legal action), optional notes and an optional
  reminder of the **mediation case** that motivated the step.
- **Threat Assessments** (`/erm/threat-assessments`) — company-threat evaluations structured
  after the ten sections of the
  [Virginia DCJS threat assessment and management form](https://www.dcjs.virginia.gov/sites/dcjs.virginia.gov/files/law-enforcement/files/vcscs/threat_assessment_and_management_form_-_pdf.pdf):
  per-section findings + severity (`unknown` → `critical`) and a roll-up **overall threat level**
  (`no-risk`, `minor`, `moderate`, `major`, `imminent`) measuring reputation, PR, legal and
  financial risk.
- **Legal Elements** (`/erm/legal-elements`) — a deliberately template-only module linking to
  (future) legal-elements databases: per-contact bundles of references organized into the four
  fixed sections **Contracts**, **Legal work code**, **Internal structural legal elements** and
  **Further legal documentation**, each reference recording a label, a physical/digital location
  and an optional external URL.

All Phase-2 entities ride along in the JSON export/import (fully schema- and foreign-key
validated) and are seeded with sample data: 4 cases, 2 escalations, 1 DCJS-structured threat
assessment and 1 legal-elements bundle.

## Technologies

- [Angular 22](https://angular.dev/) — standalone components, Signals, zoneless change detection,
  new control flow (`@if` / `@for`), lazy-loaded routes, `APP_INITIALIZER` bootstrap hook
- [TypeScript](https://www.typescriptlang.org/) in strict mode (`strict: true`, zero `any`)
- Angular Router (guards, resolvers), Reactive Forms only (strictly typed, no template-driven forms)
- [Vitest](https://vitest.dev/) for unit tests (197 specs across services, pipes, validators,
  forms and routed pages)
- [ESLint](https://eslint.org/) with [angular-eslint](https://github.com/angular-eslint/angular-eslint)
  and [Prettier](https://prettier.io/)
- Plain CSS with custom properties — **no UI or CSS component library of any kind**

## Installation

Prerequisites: Node.js 20+ (or later) and npm.

```bash
npm install
```

## Run the Project

```bash
npm start   # or: npm run dev
```

The application is served at [http://localhost:4200/](http://localhost:4200/).

Other useful commands:

```bash
npm run build   # production build into dist/
npm test        # unit tests (Vitest, single run)
npm run lint    # ESLint (TS + templates)
npm run format  # Prettier
```

## Architecture & Design Choices

```
src/app/
├── core/                             # framework-independent building blocks
│   ├── models/
│   │   ├── contact-name.model.ts     # dual-mode ContactName + composeFullName()
│   │   ├── contact.model.ts          # Contact, ContactFilters, HR lifecycle types
│   │   ├── company.model.ts          # Company + size/structure/sector catalogues
│   │   ├── category.model.ts         # bilingual category types
│   │   ├── snapshot.model.ts         # versioned full-database snapshot
│   │   └── phase2/                   # ERM domain types (Case, Escalation,
│   │                                 #   ThreatAssessment, LegalElements)
│   ├── services/
│   │   ├── storage.service.ts        # safe namespaced localStorage + versioned
│   │   │                             #   JSON import/export
│   │   ├── migration.service.ts      # SCHEMA_VERSION check, wipe & reseed on
│   │   │                             #   mismatch (run via APP_INITIALIZER)
│   │   ├── brand.service.ts          # CRM ↔ ERM brand switching on /erm/* routes
│   │   ├── contact.service.ts        # signal state + token-aware search + CRUD
│   │   ├── company.service.ts        # company state, usage counts, guarded delete
│   │   ├── category.service.ts       # category state + usage counts + guarded delete
│   │   ├── case.service.ts           # ERM cases (Phase 2)
│   │   ├── escalation.service.ts     # ERM escalation steps (Phase 2)
│   │   ├── threat-assessment.service.ts  # ERM threat evaluations (Phase 2)
│   │   ├── legal-elements.service.ts # ERM legal reference bundles (Phase 2)
│   │   ├── data-transfer.service.ts  # schema-validated JSON export / import
│   │   ├── vcard.service.ts          # vCard 4.0 (RFC 6350) export + import
│   │   ├── seed-data.ts              # sample contacts, companies, categories
│   │   ├── theme.service.ts          # light/dark theme (persisted, OS-aware)
│   │   └── i18n.service.ts           # FR/EN dictionaries + reactive translate()
│   ├── validators/                   # RFC-5322 email, E.164-range phone, hex color,
│   │                                 #   contact-name group validator
│   ├── pipes/                        # fullName, initials, highlight, t, catName
│   ├── directives/                   # appAutofocus, appDebounceInput
│   ├── guards/                       # canDeactivate (unsaved form protection)
│   ├── resolvers/                    # contact, category, company preloaders
│   └── utils/                        # UUID-like id generation, timestamps
├── features/                         # one folder per feature, all lazy-loaded
│   ├── dashboard/
│   ├── contacts/                     # list (+filters/pagination), form, detail
│   ├── categories/                   # list, form (create/edit), detail
│   ├── companies/                    # modal-CRUD registry page
│   ├── favorites/
│   └── erm/                          # Phase 2 — ERM product line (/erm/*)
│       ├── cases-page/               # irritants, conflicts, complaints, mediations
│       ├── escalations-page/         # hierarchical ladder steps
│       ├── threat-assessments-page/  # DCJS-inspired evaluations
│       └── legal-elements-page/      # four-section reference bundles
└── shared/                           # contact card, confirm dialog, pager
```

Key decisions:

- **Signal-based state** — each repository (contacts, companies, categories) holds its state in
  read-only signals exposed by `providedIn: 'root'` services. Views are pure functions of that
  state, keeping zoneless change detection cheap and predictable.
- **Versioned, swappable persistence** — feature code only talks to domain services;
  `StorageService` is the single place touching `localStorage` (namespaced keys under
  `contacts-erm`, JSON serialization, error handling). `MigrationService` runs before any domain
  service via `APP_INITIALIZER`: on a `SCHEMA_VERSION` mismatch it wipes and reseeds rather than
  best-effort migrating, guaranteeing consistent data. Replacing it with an HTTP backend would
  not touch a single component. The same `DataSnapshot` format (with a `schemaVersion` field)
  backs the JSON export/import, which validates per-entity shape, id uniqueness and
  foreign-key integrity before committing.
- **Dual-mode naming** — `ContactName` supports a direct full name and/or a structured token
  breakdown (titles, 0–N middle names, `western`/`eastern`/`custom` order). The `fullName` pipe
  composes the right rendering; `initials` derives fallback avatar glyphs. Forms expose both
  entry modes side by side.
- **Referential integrity in the UI, not just in code** — deleting a category or company still
  referenced by contacts is blocked with a translated error; the JSON importer rejects dangling
  foreign keys and duplicate ids outright.
- **Reactive Forms only** — all forms are strictly typed with `NonNullableFormBuilder`, custom
  validators for email (RFC-5322), phone (E.164-range with extensions), hex colors, and a
  cross-field group validator for contact names.
- **Router-driven UX** — every route is a lazy-loaded standalone component; resolvers preload
  the edited/pre-viewed entity and redirect on unknown ids; a `CanDeactivate` guard warns about
  unsaved changes; resolved data and route params bind directly to component inputs.
- **Accessibility first** — semantic HTML, skip link, `aria-pressed` favorite toggles,
  combobox/listbox semantics on quick search, labelled dialogs with focus trapping, full
  keyboard navigation, and `focus-visible` outlines throughout.
- **No UI library** — the design system is hand-rolled: CSS custom properties with light and
  dark themes (`data-theme` attribute), tokens for color/spacing/shadow, and mobile-first
  grid/flexbox layouts.
- **i18n** — a small FR/EN dictionary served reactively through the `t` pipe, switchable from
  the header and persisted per user; English is the fallback. Category names are bilingual too:
  a category stores both an English and a French name (`BilingualText`), and the `catName` pipe
  renders the right one for the active language.
- **Two product lines, one codebase** — the ERM (Phase 2) lives under its own `/erm/*` route
  subtree and feature folder, with domain services (`CaseService`, `EscalationService`,
  `ThreatAssessmentService`, `LegalElementsService`) that attach to contacts via `contactId`.
  `BrandService` flips the header brand (logo + title) by observing the activated URL, so the
  ERM presents itself as a distinct product ("Connects ERM") without duplicating the shell.
  Phase-1 code was not rewritten to host any of it: the models were merely declared ahead of
  time and the router/sidebar extended.

## Provenance

Contacts ERM was created by cloning the earlier `contact-crm` training project and rebranding it:
same architecture and feature set, new name (`contacts-ERM`), new storage namespace
(`contacts-erm:*`), new export filename (`contacts-erm-export.json`) and a rebranded header asset.

## Author

bostur_l with Mistral help.

Built as a training project for the Code2Work Angular team.
