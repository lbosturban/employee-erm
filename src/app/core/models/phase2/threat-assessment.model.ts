/**
 * ─── PHASE 2 ANCHOR MODEL ────────────────────────────────────────────────
 * Declared in Phase 1 for architectural readiness only. The Phase-2
 * `ThreatAssessments` module evaluates company threats (reputation, PR,
 * legal condemnation, financial penalties) using a structured form
 * informed by the Virginia DCJS "Threat Assessment and Management"
 * reference form:
 * https://www.dcjs.virginia.gov/sites/dcjs.virginia.gov/files/law-enforcement/files/vcscs/threat_assessment_and_management_form_-_pdf.pdf
 */

/**
 * Assessment sections mirroring the DCJS reference form (non-exhaustive;
 * Phase 2 will refine wording and add per-section fields).
 */
export type ThreatSection =
  | 'identity' // who is the subject of concern
  | 'motives' // motive for aggressive behavior
  | 'grievance' // perceived injustices / workplace irritants
  | 'targeting' // intended targets
  | 'capability' // weapons, access, skills relevant to the threat
  | 'breach-attempts' // boundary-violating behaviors
  | 'direct-leakage' // communicated intent to harm
  | 'risk-attitude' // attitude toward solving problems by force
  | 'mitigation' // management / intervention plan
  | 'final-classification';

/** Answer object for one DCJS-inspired section (structure defined in Phase 2). */
export interface ThreatSectionEntry {
  section: ThreatSection;
  /** Free-form findings recorded by the assessor. */
  findings: string;
  /** Qualitative severity contributed by this section. */
  severity: 'unknown' | 'low' | 'moderate' | 'high' | 'critical';
}

/** Company-threat evaluation attached to a contact via `contactId`. */
export interface ThreatAssessment {
  id: string;
  contactId: string;
  companyId: string | null;
  /** Per-section findings. */
  sections: ThreatSectionEntry[];
  /** Roll-up threat level to reputation, PR, legal and financial risk. */
  overallThreat: 'no-risk' | 'minor' | 'moderate' | 'major' | 'imminent';
  createdAt: string;
}
