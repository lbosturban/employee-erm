/**
 * ─── PHASE 2 ANCHOR MODEL ────────────────────────────────────────────────
 * Declared in Phase 1 for architectural readiness only. Phase 2 will use
 * these types for the `Escalations` module: each escalation is attached
 * to real contacts via `contactId` fields and can remind a mediation.
 */

/**
 * Positions on the hierarchical escalation ladder:
 * Superiors → Management → HR → Legal Department.
 */
export type EscalationLevel = 'superior' | 'management' | 'hr' | 'legal';

export const ESCALATION_LEVELS: readonly EscalationLevel[] = [
  'superior',
  'management',
  'hr',
  'legal',
];

/** Why the escalation was carried out. */
export type EscalationPurpose =
  | 'information'
  | 'protection'
  | 'resolution'
  | 'sanction'
  | 'legal-action';

/** All escalation purposes, in display order. */
export const ESCALATION_PURPOSES: readonly EscalationPurpose[] = [
  'information',
  'protection',
  'resolution',
  'sanction',
  'legal-action',
];

/**
 * One escalation step: a source contact initiating it toward a targeted
 * contact, with an optional reminder of the mediation case that
 * motivated, or should accompany, the escalation.
 */
export interface Escalation {
  id: string;
  /** Contact initiating the escalation (source escalation). */
  sourceContactId: string;
  /** Contact escalated against (targeted escalation). */
  targetContactId: string;
  /** Position on the ladder the step originates from. */
  sourceLevel: EscalationLevel;
  /** Position on the ladder the step targets. */
  targetLevel: EscalationLevel;
  /** Classification of the escalation motive. */
  purpose: EscalationPurpose;
  /** Optional reference to the related mediation case (`CrmCase.id`). */
  mediationCaseId: string | null;
  /** Free-form context recorded by the initiator of the step. */
  notes: string;
  createdAt: string;
}

/** Everything the caller supplies when recording a new escalation step. */
export type EscalationDraft = Omit<Escalation, 'id' | 'createdAt'>;
