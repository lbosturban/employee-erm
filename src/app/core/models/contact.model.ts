/** A contact entry managed by the ERM. All timestamps are ISO-8601 strings. */
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  /** Id of the owning category, or null when the contact is uncategorized. */
  categoryId: string | null;
  favorite: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Sort options available for contact lists. */
export type ContactSort = 'nameAsc' | 'nameDesc' | 'dateDesc' | 'dateAsc';

/** Filters applying to a contact list view. */
export interface ContactFilters {
  search: string;
  categoryId: string | null;
  favoritesOnly: boolean;
  sort: ContactSort;
}
