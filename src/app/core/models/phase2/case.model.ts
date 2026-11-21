/**
 * ─── PHASE 2 MODEL (activated in Phase 2, declared in Phase 1) ───────────
 * A `Cases` module attaching workplace irritants, conflicts, complaints
 * and mediations to any number of contacts via `contactIds` and,
 * optionally, to the company under which the case arose.
 */

/** Taxonomy of workplace cases tracked by the ERM. */
export type CaseKind = 'irritant' | 'conflict' | 'complaint' | 'mediation';

/** All case kinds, in display order. */
export const CASE_KINDS: readonly CaseKind[] = ['irritant', 'conflict', 'complaint', 'mediation'];

/**
 * Lifecycle of a case within the ERM: freshly recorded cases are
 * `open`, move to `observed` once actively monitored (e.g. paired with
 * an escalation), and end `resolved` after mediation or closure.
 */
export type CaseStatus = 'open' | 'observed' | 'resolved';

/** All case statuses, in lifecycle order. */
export const CASE_STATUSES: readonly CaseStatus[] = ['open', 'observed', 'resolved'];

/**
 * An ERM case: a workplace irritant, conflict, complaint or mediation
 * concerning one or more contacts. Reminder/escalation hooks are free
 * now and are used by the Phase-2 Escalations module
 * (`Escalation.mediationCaseId`).
 */
export interface CrmCase {
  id: string;
  kind: CaseKind;
  /** Short human title of the case. */
  title: string;
  /** Free-form narrative of what happened, when and where. */
  description: string;
  /**
   * Contacts concerned by this case. Kept as a map-like array of
   * `contactId`s (contacts own the reverse link through case tables).
   */
  contactIds: string[];
  /** Company under which the case arose, when known. */
  companyId: string | null;
  status: CaseStatus;
  createdAt: string;
  /** Last status or content modification (audit trail). */
  updatedAt: string;
}

/** Everything the caller supplies when creating a new case. */
export type CrmCaseDraft = Omit<CrmCase, 'id' | 'createdAt' | 'updatedAt'>;
