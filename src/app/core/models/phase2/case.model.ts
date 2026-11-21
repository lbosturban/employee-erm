/**
 * ─── PHASE 2 ANCHOR MODEL ────────────────────────────────────────────────
 * Declared in Phase 1 for architectural readiness only: nothing in the
 * Phase-1 CRM references these types yet. Phase 2 attaches a `Cases`
 * module to contacts via `contactId` (see the `contactIds` map below)
 * without touching Phase-1 code.
 */

/** Taxonomy of workplace cases tracked by the ERM. */
export type CaseKind = 'irritant' | 'conflict' | 'complaint' | 'mediation';

/** All case kinds, in display order. */
export const CASE_KINDS: readonly CaseKind[] = ['irritant', 'conflict', 'complaint', 'mediation'];

/**
 * An ERM case: a workplace irritant, conflict, complaint or mediation
 * concerning one or more contacts. Reminder/escalation hooks are free
 * now and will be filled by the Phase-2 Escalations module.
 */
export interface CrmCase {
  id: string;
  kind: CaseKind;
  /** Short human title of the case. */
  title: string;
  /**
   * Contacts concerned by this case. Kept as a map-like array of
   * `contactId`s (contacts own the reverse link through case tables).
   */
  contactIds: string[];
  /** Company under which the case arose, when known. */
  companyId: string | null;
  createdAt: string;
}
