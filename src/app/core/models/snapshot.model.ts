import { Category } from './category.model';
import { Contact } from './contact.model';
import { Company } from './company.model';
import { CrmCase } from './phase2/case.model';
import { Escalation } from './phase2/escalation.model';
import { LegalElementsBundle } from './phase2/legal-elements.model';
import { ThreatAssessment } from './phase2/threat-assessment.model';

/**
 * Full-database snapshot exchanged by the JSON Import/Export feature.
 * `schemaVersion` lets an importer validate or migrate the file before
 * anything touches localStorage.
 *
 * The four Phase-2 (ERM) arrays were added with schema version 3; an
 * importer accepts snapshots without them (treated as empty) so legacy
 * Phase-1 exports keep importing.
 */
export interface DataSnapshot {
  schemaVersion: number;
  categories: Category[];
  companies: Company[];
  contacts: Contact[];
  cases: CrmCase[];
  escalations: Escalation[];
  threatAssessments: ThreatAssessment[];
  legalElementsBundles: LegalElementsBundle[];
}
