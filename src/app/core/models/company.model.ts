/**
 * CRM-managed company entity. Companies are dynamic rows assignable to
 * contacts (and, in Phase 2, to cases through their contacts). The
 * managed vocabularies (sizes, business structures, sectors) are
 * pre-seeded system defaults exposed below as typed constants so the
 * union types stay exhaustively checked; they are translatable through
 * the FR/EN dictionaries and extensible by editing these unions.
 */

export type CompanySize =
  | 'Self-Employed Enterprise' // 1 person
  | 'Micro Enterprise' // fewer than 10 employees
  | 'Small Enterprise' // 10 to 49 employees
  | 'Medium Enterprise' // 50 to 249 employees
  | 'Large Enterprise' // 250 to 999 employees
  | 'Very Large Enterprise' // 1000 to 4999 employees
  | 'Major Enterprise'; // more than 5000 employees

export type BusinessStructure =
  | 'Individual' // self-employed, sole proprietors or freelancers
  | 'Sole Proprietorship' // single owner, no legal distinction with the business
  | 'Partnership' // two or more owners sharing responsibilities and profits
  | 'Limited Liability Company' // hybrid corporation/partnership with liability protection
  | 'Corporation'; // separate legal entity (C or S corporations)

/**
 * Sectors of operation. The union includes the spec's baseline set and
 * can grow ("other" absorbs not-yet-listed industries).
 */
export type Sector =
  | 'Technology'
  | 'Healthcare'
  | 'Construction'
  | 'Retail'
  | 'Manufacturing'
  | 'Finance'
  | 'Agriculture'
  | 'Transportation'
  | 'Other';

/** Pre-seeded system defaults for the managed `size` field. */
export const COMPANY_SIZES: readonly CompanySize[] = [
  'Self-Employed Enterprise',
  'Micro Enterprise',
  'Small Enterprise',
  'Medium Enterprise',
  'Large Enterprise',
  'Very Large Enterprise',
  'Major Enterprise',
];

/** Pre-seeded system defaults for the managed business-structure field. */
export const BUSINESS_STRUCTURES: readonly BusinessStructure[] = [
  'Individual',
  'Sole Proprietorship',
  'Partnership',
  'Limited Liability Company',
  'Corporation',
];

/** Pre-seeded system defaults for the managed sector field. */
export const SECTORS: readonly Sector[] = [
  'Technology',
  'Healthcare',
  'Construction',
  'Retail',
  'Manufacturing',
  'Finance',
  'Agriculture',
  'Transportation',
  'Other',
];

/** A short factual descriptor of a size, for tooltips and forms. */
export const COMPANY_SIZE_HINTS: Readonly<Record<CompanySize, string>> = {
  'Self-Employed Enterprise': '1 person',
  'Micro Enterprise': 'Fewer than 10 employees',
  'Small Enterprise': '10 to 49 employees',
  'Medium Enterprise': '50 to 249 employees',
  'Large Enterprise': '250 to 999 employees',
  'Very Large Enterprise': '1000 to 4999 employees',
  'Major Enterprise': 'More than 5000 employees',
};

/** CRM-managed company row. */
export interface Company {
  id: string; // UUID
  name: string;
  size: CompanySize;
  businessStructure: BusinessStructure;
  /** Sector of operation. */
  sector: Sector;
  /**
   * UUID of the CEO — a {@link Contact} row. Exposed on the company as
   * `contactId` (the same direction Phase-2 modules use to reference
   * contacts), read from ContactService for display.
   */
  contactId: string | null;
  createdAt: string; // RFC3339 UTC
}

/** Data needed to create a new company (id and timestamp are generated). */
export type CompanyDraft = Pick<
  Company,
  'name' | 'size' | 'businessStructure' | 'sector' | 'contactId'
>;
