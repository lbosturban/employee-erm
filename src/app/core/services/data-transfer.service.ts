import { Injectable } from '@angular/core';
import { BilingualText } from '../models/category.model';
import { Contact, HR_PROCESS_STATUSES } from '../models/contact.model';
import { ContactName } from '../models/contact-name.model';
import { Category } from '../models/category.model';
import { Company, COMPANY_SIZES, BUSINESS_STRUCTURES, SECTORS } from '../models/company.model';
import { DataSnapshot } from '../models/snapshot.model';
import { CrmCase, CASE_KINDS, CASE_STATUSES } from '../models/phase2/case.model';
import {
  Escalation,
  ESCALATION_LEVELS,
  ESCALATION_PURPOSES,
} from '../models/phase2/escalation.model';
import {
  ThreatAssessment,
  ThreatSectionEntry,
  THREAT_LEVELS,
} from '../models/phase2/threat-assessment.model';
import { LegalElementsBundle, LEGAL_SECTION_KINDS } from '../models/phase2/legal-elements.model';
import { SCHEMA_VERSION } from './migration.service';

/**
 * Import/export of the full data set (contacts + categories +
 * companies) as a JSON file. Keeping this in a dedicated service makes
 * the exchange format testable and reusable by a future backend
 * synchronization layer.
 */
@Injectable({ providedIn: 'root' })
export class DataTransferService {
  /** Triggers a browser download of the snapshot as a JSON file. */
  export(snapshot: DataSnapshot): void {
    const blob = new Blob([JSON.stringify({ ...snapshot, schemaVersion: SCHEMA_VERSION }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'contacts-erm-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Reads and validates a JSON file produced by `export`. Resolves with
   * the snapshot, or rejects with a descriptive error. Validation covers
   * entity shapes, id uniqueness and referential integrity so a bad file
   * can never corrupt localStorage.
   */
  import(file: File): Promise<DataSnapshot> {
    return file
      .text()
      .then((raw) => this.parse(raw))
      .catch((error: unknown) => {
        throw new Error(error instanceof Error ? error.message : 'Invalid JSON file');
      });
  }

  private parse(raw: string): DataSnapshot {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Invalid JSON file: malformed JSON.');
    }
    if (!isSnapshotShape(data)) {
      throw new Error('Invalid JSON file: expected categories, companies and contacts arrays.');
    }
    if (typeof data.schemaVersion !== 'number' || data.schemaVersion > SCHEMA_VERSION) {
      throw new Error(
        `Unsupported snapshot schema version (${String(data.schemaVersion)}; expected ≤ ${SCHEMA_VERSION}).`,
      );
    }
    validateEntities(data);
    return data;
  }
}

/** Runtime structural check of the snapshot envelope. The four ERM
 * arrays are optional: legacy Phase-1 snapshots (schema ≤ 2) import
 * with them treated as empty. */
function isSnapshotShape(data: unknown): data is DataSnapshot {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const candidate = data as Partial<DataSnapshot>;
  const optionalArray = (value: unknown): boolean => value === undefined || Array.isArray(value);
  return (
    Array.isArray(candidate.contacts) &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.companies) &&
    optionalArray(candidate.cases) &&
    optionalArray(candidate.escalations) &&
    optionalArray(candidate.threatAssessments) &&
    optionalArray(candidate.legalElementsBundles)
  );
}

/** Aggregated entity + integrity validation with precise error messages. */
function validateEntities(snapshot: DataSnapshot): void {
  const contactIds = new Set<string>();
  snapshot.contacts.forEach((contact, index) => {
    if (!isContact(contact)) {
      throw new Error(`Invalid contact at index ${index}.`);
    }
    if (contactIds.has(contact.id)) {
      throw new Error(`Duplicate contact id "${contact.id}".`);
    }
    contactIds.add(contact.id);
  });

  const categoryIds = new Set<string>();
  snapshot.categories.forEach((category, index) => {
    if (!isCategory(category)) {
      throw new Error(`Invalid category at index ${index}.`);
    }
    if (categoryIds.has(category.id)) {
      throw new Error(`Duplicate category id "${category.id}".`);
    }
    categoryIds.add(category.id);
  });

  const companyIds = new Set<string>();
  snapshot.companies.forEach((company, index) => {
    if (!isCompany(company)) {
      throw new Error(`Invalid company at index ${index}.`);
    }
    if (companyIds.has(company.id)) {
      throw new Error(`Duplicate company id "${company.id}".`);
    }
    companyIds.add(company.id);
  });

  // Referential integrity: broken foreign keys would silently hide data.
  for (const contact of snapshot.contacts) {
    if (contact.categoryId !== null && !categoryIds.has(contact.categoryId)) {
      throw new Error(`Contact "${contact.id}" references unknown category "${contact.categoryId}".`);
    }
    if (contact.companyId !== null && !companyIds.has(contact.companyId)) {
      throw new Error(`Contact "${contact.id}" references unknown company "${contact.companyId}".`);
    }
  }
  for (const company of snapshot.companies) {
    if (company.contactId !== null && !contactIds.has(company.contactId)) {
      throw new Error(`Company "${company.id}" references unknown CEO contact "${company.contactId}".`);
    }
  }

  // ── Phase-2 (ERM) entities, kept optional for legacy snapshots ──
  const cases = snapshot.cases ?? [];
  const caseIds = new Set<string>();
  cases.forEach((entry, index) => {
    if (!isCase(entry)) {
      throw new Error(`Invalid case at index ${index}.`);
    }
    if (caseIds.has(entry.id)) {
      throw new Error(`Duplicate case id "${entry.id}".`);
    }
    caseIds.add(entry.id);
    for (const contactId of entry.contactIds) {
      if (!contactIds.has(contactId)) {
        throw new Error(`Case "${entry.id}" references unknown contact "${contactId}".`);
      }
    }
    if (entry.companyId !== null && !companyIds.has(entry.companyId)) {
      throw new Error(`Case "${entry.id}" references unknown company "${entry.companyId}".`);
    }
  });

  (snapshot.escalations ?? []).forEach((entry, index) => {
    if (!isEscalation(entry)) {
      throw new Error(`Invalid escalation at index ${index}.`);
    }
    if (!contactIds.has(entry.sourceContactId)) {
      throw new Error(
        `Escalation "${entry.id}" references unknown source contact "${entry.sourceContactId}".`,
      );
    }
    if (!contactIds.has(entry.targetContactId)) {
      throw new Error(
        `Escalation "${entry.id}" references unknown target contact "${entry.targetContactId}".`,
      );
    }
    if (entry.mediationCaseId !== null && !caseIds.has(entry.mediationCaseId)) {
      throw new Error(
        `Escalation "${entry.id}" references unknown mediation case "${entry.mediationCaseId}".`,
      );
    }
  });

  (snapshot.threatAssessments ?? []).forEach((entry, index) => {
    if (!isThreatAssessment(entry)) {
      throw new Error(`Invalid threat assessment at index ${index}.`);
    }
    if (!contactIds.has(entry.contactId)) {
      throw new Error(
        `Threat assessment "${entry.id}" references unknown contact "${entry.contactId}".`,
      );
    }
    if (entry.companyId !== null && !companyIds.has(entry.companyId)) {
      throw new Error(
        `Threat assessment "${entry.id}" references unknown company "${entry.companyId}".`,
      );
    }
  });

  (snapshot.legalElementsBundles ?? []).forEach((entry, index) => {
    if (!isLegalElementsBundle(entry)) {
      throw new Error(`Invalid legal elements bundle at index ${index}.`);
    }
    if (!contactIds.has(entry.contactId)) {
      throw new Error(
        `Legal elements bundle "${entry.id}" references unknown contact "${entry.contactId}".`,
      );
    }
    if (entry.companyId !== null && !companyIds.has(entry.companyId)) {
      throw new Error(
        `Legal elements bundle "${entry.id}" references unknown company "${entry.companyId}".`,
      );
    }
  });
}

export function isContact(value: unknown): value is Contact {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const contact = value as Partial<Contact>;
  return (
    typeof contact.id === 'string' &&
    contact.id.trim() !== '' &&
    isContactName(contact.name) &&
    typeof contact.email === 'string' &&
    typeof contact.phone === 'string' &&
    typeof contact.city === 'string' &&
    typeof contact.jobTitle === 'string' &&
    (contact.companyId === null || typeof contact.companyId === 'string') &&
    (contact.categoryId === null || typeof contact.categoryId === 'string') &&
    typeof contact.isCompanyActive === 'boolean' &&
    contact.hrProcessStatus !== undefined &&
    (HR_PROCESS_STATUSES as string[]).includes(contact.hrProcessStatus) &&
    typeof contact.favorite === 'boolean' &&
    typeof contact.notes === 'string' &&
    typeof contact.profileImageUrl === 'string' &&
    typeof contact.profileImageAlt === 'string'
  );
}

/** Accepts the bilingual shape ({ en, fr }) and legacy plain string names. */
export function isCategory(value: unknown): value is Category {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const category = value as Partial<Category>;
  return (
    typeof category.id === 'string' &&
    category.id.trim() !== '' &&
    isValidCategoryName(category.name) &&
    typeof category.color === 'string' &&
    typeof category.createdAt === 'string'
  );
}

function isValidCategoryName(name: unknown): name is BilingualText {
  if (typeof name === 'string') {
    return name.trim().length > 0;
  }
  if (typeof name !== 'object' || name === null) {
    return false;
  }
  const bilingual = name as Partial<BilingualText>;
  return (
    (typeof bilingual.en === 'string' && bilingual.en.trim().length > 0) ||
    (typeof bilingual.fr === 'string' && bilingual.fr.trim().length > 0)
  );
}

export function isCompany(value: unknown): value is Company {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const company = value as Partial<Company>;
  return (
    typeof company.id === 'string' &&
    company.id.trim() !== '' &&
    typeof company.name === 'string' &&
    company.name.trim() !== '' &&
    company.size !== undefined &&
    (COMPANY_SIZES as readonly string[]).includes(company.size) &&
    company.businessStructure !== undefined &&
    (BUSINESS_STRUCTURES as readonly string[]).includes(company.businessStructure) &&
    company.sector !== undefined &&
    (SECTORS as readonly string[]).includes(company.sector) &&
    (company.contactId === null || typeof company.contactId === 'string') &&
    typeof company.createdAt === 'string'
  );
}

/** Local, lazily-evaluated name validation shared by isContact. */
function isContactName(name: unknown): name is ContactName {
  if (typeof name !== 'object' || name === null) {
    return false;
  }
  const candidate = name as Partial<ContactName>;
  const modeOk = candidate.mode === 'full' || candidate.mode === 'structured';
  const orderOk = ['western', 'eastern', 'custom'].includes(String(candidate.culturalOrder));
  const rawOk = typeof candidate.rawFullName === 'string';
  const tokensOk =
    (typeof candidate.firstName === 'string' || candidate.firstName === undefined) &&
    (typeof candidate.lastName === 'string' || candidate.lastName === undefined) &&
    (candidate.middleNames === undefined || Array.isArray(candidate.middleNames));
  return modeOk && orderOk && rawOk && tokensOk;
}

/** Phase 2 — ERM entity guards. Enumerations are validated against the
 * same typed constants the UI uses, so an unknown kind or level can
 * never enter localStorage through the JSON import. */
export function isCase(value: unknown): value is CrmCase {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entity = value as Partial<CrmCase>;
  return (
    typeof entity.id === 'string' &&
    entity.id.trim() !== '' &&
    entity.kind !== undefined &&
    (CASE_KINDS as readonly string[]).includes(entity.kind) &&
    typeof entity.title === 'string' &&
    entity.title.trim() !== '' &&
    typeof entity.description === 'string' &&
    Array.isArray(entity.contactIds) &&
    entity.contactIds.every((id) => typeof id === 'string') &&
    (entity.companyId === null || typeof entity.companyId === 'string') &&
    entity.status !== undefined &&
    (CASE_STATUSES as readonly string[]).includes(entity.status) &&
    typeof entity.createdAt === 'string' &&
    typeof entity.updatedAt === 'string'
  );
}

export function isEscalation(value: unknown): value is Escalation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entity = value as Partial<Escalation>;
  return (
    typeof entity.id === 'string' &&
    entity.id.trim() !== '' &&
    typeof entity.sourceContactId === 'string' &&
    typeof entity.targetContactId === 'string' &&
    entity.sourceLevel !== undefined &&
    (ESCALATION_LEVELS as readonly string[]).includes(entity.sourceLevel) &&
    entity.targetLevel !== undefined &&
    (ESCALATION_LEVELS as readonly string[]).includes(entity.targetLevel) &&
    entity.purpose !== undefined &&
    (ESCALATION_PURPOSES as readonly string[]).includes(entity.purpose) &&
    (entity.mediationCaseId === null || typeof entity.mediationCaseId === 'string') &&
    typeof entity.notes === 'string' &&
    typeof entity.createdAt === 'string'
  );
}

export function isThreatAssessment(value: unknown): value is ThreatAssessment {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entity = value as Partial<ThreatAssessment>;
  return (
    typeof entity.id === 'string' &&
    entity.id.trim() !== '' &&
    typeof entity.contactId === 'string' &&
    (entity.companyId === null || typeof entity.companyId === 'string') &&
    Array.isArray(entity.sections) &&
    entity.sections.every(isThreatSectionEntry) &&
    ((THREAT_LEVELS) as readonly string[]).includes(String(entity.overallThreat)) &&
    typeof entity.createdAt === 'string'
  );
}

function isThreatSectionEntry(value: unknown): value is ThreatSectionEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Partial<ThreatSectionEntry>;
  return (
    typeof entry.section === 'string' &&
    typeof entry.findings === 'string' &&
    entry.severity !== undefined &&
    ['unknown', 'low', 'moderate', 'high', 'critical'].includes(entry.severity)
  );
}

export function isLegalElementsBundle(value: unknown): value is LegalElementsBundle {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entity = value as Partial<LegalElementsBundle>;
  return (
    typeof entity.id === 'string' &&
    entity.id.trim() !== '' &&
    typeof entity.contactId === 'string' &&
    (entity.companyId === null || typeof entity.companyId === 'string') &&
    Array.isArray(entity.references) &&
    entity.references.every((reference) => {
      if (typeof reference !== 'object' || reference === null) {
        return false;
      }
      const candidate = reference as Partial<LegalElementsBundle['references'][number]>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.label === 'string' &&
        typeof candidate.location === 'string' &&
        candidate.kind !== undefined &&
        (LEGAL_SECTION_KINDS as readonly string[]).includes(candidate.kind) &&
        (candidate.externalUrl === null || typeof candidate.externalUrl === 'string')
      );
    }) &&
    typeof entity.createdAt === 'string'
  );
}
