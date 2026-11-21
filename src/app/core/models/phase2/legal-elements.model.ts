/**
 * ─── PHASE 2 ANCHOR MODEL ────────────────────────────────────────────────
 * Declared in Phase 1 for architectural readiness only. The Phase-2
 * "Legal Elements" module is a template that will link to external
 * legal-elements databases without implementing them fully: it ships
 * only with structured sections, ready to hold references and excerpts.
 */

/** Fixed section structure Phase 2 will render as tabs on a bundle. */
export type LegalSectionKind =
  | 'contracts' // employment contracts
  | 'legal-work-code' // Labour Code / Code du travail references
  | 'internal-structural-elements' // internal policies, summaries and org acts
  | 'further-legal-documentation'; // everything else (pricing, letters, filings)

export const LEGAL_SECTION_KINDS: readonly LegalSectionKind[] = [
  'contracts',
  'legal-work-code',
  'internal-structural-elements',
  'further-legal-documentation',
];

/** One reference entry inside a section (link to a legal database, file…). */
export interface LegalElementReference {
  id: string;
  kind: LegalSectionKind;
  /** Human label of the legal element (article, clause, policy name…). */
  label: string;
  /** Where the element lives (external database, folder, archive box…). */
  location: string;
  /** Optional external URL to the legal database entry. */
  externalUrl: string | null;
}

/** Bundle of legal elements attached to a contact via `contactId`. */
export interface LegalElementsBundle {
  id: string;
  contactId: string;
  companyId: string | null;
  references: LegalElementReference[];
  createdAt: string;
}
