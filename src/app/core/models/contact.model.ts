import { ContactName } from './contact-name.model';

/**
 * Contact entry of the CRM, "ERM-ready": the Phase-2 case/escalation/
 * threat-assessment modules will attach to a contact through its `id`
 * only (foreign key exposed as `contactId` there), so this interface can
 * stay untouched when Phase 2 lands.
 */

/** Internal HR department lifecycle state of a contact. */
export type HrProcessStatus = 'Pending' | 'Active' | 'Inactive' | 'Archived';

/** All HR lifecycle values, in display order. */
export const HR_PROCESS_STATUSES: HrProcessStatus[] = ['Pending', 'Active', 'Inactive', 'Archived'];

export interface Contact {
  id: string; // UUID, generated
  /** Hybrid direct/structured name (see contact-name.model.ts). */
  name: ContactName;
  /** Job role / position inside the assigned company. */
  jobTitle: string;
  /** Strictly validated at form level (RFC-5322, see custom-validators.ts). */
  email: string;
  /** International or local format, validated by phoneValidator(). */
  phone: string;
  /** City of residence or workplace. */
  city: string;
  /** Foreign key referencing the CRM-managed Company list. */
  companyId: string | null;
  /**
   * Whether the contact is still present in their assigned company.
   * Rendered as "Active"/"Inactive" badge in the UI.
   */
  isCompanyActive: boolean;
  /** Lifecycle state tracked by our own HR department. */
  hrProcessStatus: HrProcessStatus;
  /** Foreign key referencing Category, or null when uncategorized. */
  categoryId: string | null;
  /** Starred flag, default false. */
  favorite: boolean;
  /** Free-form notes. */
  notes: string;
  /** Empty, missing or broken URL ⇒ generated SVG-initials avatar. */
  profileImageUrl: string;
  /** Rendered as img alt AND hover title; descriptive fallback applied. */
  profileImageAlt: string;
  /** RFC3339 UTC timestamp, set once at creation (read-only). */
  addedAt: string;
  /** RFC3339 UTC timestamp, bumped automatically on each modification. */
  updatedAt: string;
}

/** Sort options available for contact lists. */
export type ContactSort = 'nameAsc' | 'nameDesc' | 'dateDesc' | 'dateAsc';

/** Filters applying to a contact list view. */
export interface ContactFilters {
  /** Free-text search over name tokens (full name and structured tokens). */
  search: string;
  categoryId: string | null;
  /** Filter on the HR lifecycle state. */
  hrStatus: HrProcessStatus | null;
  /** Filter on the company-activity badge ('Active' / 'Inactive'). */
  companyActive: boolean | null;
  favoritesOnly: boolean;
  sort: ContactSort;
}

/** Default filter state for list views. */
export function emptyContactFilters(): ContactFilters {
  return {
    search: '',
    categoryId: null,
    hrStatus: null,
    companyActive: null,
    favoritesOnly: false,
    sort: 'nameAsc',
  };
}

/** Data needed to create a new contact (id and timestamps are generated). */
export type ContactDraft = Omit<Contact, 'id' | 'addedAt' | 'updatedAt'>;
