import { Injectable, computed, inject, signal } from '@angular/core';
import { Contact, HrProcessStatus } from '../models/contact.model';
import { StorageService } from './storage.service';
import { generateId, nowIso } from '../utils/id';
import { composeFullName } from '../models/contact-name.model';

const STORAGE_KEY = 'contacts';

/**
 * Single source of truth for contacts. State is held in a signal and
 * mirrored to localStorage on every mutation. All access to contacts
 * goes through this service so a future backend (or the Phase-2 ERM
 * modules, which reference contacts via their `id`) can build on it
 * without touching feature code.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly storage = inject(StorageService);

  private readonly _contacts = signal<Contact[]>(this.load());
  private readonly lastPersistFailed = signal(false);

  /** Read-only list of all contacts. */
  readonly contacts = this._contacts.asReadonly();

  readonly total = computed(() => this._contacts().length);
  readonly favoriteCount = computed(
    () => this._contacts().filter((contact) => contact.favorite).length,
  );

  /** Contacts present in their assigned company, vs. those who left. */
  readonly companyActiveCount = computed(
    () => this._contacts().filter((contact) => contact.isCompanyActive).length,
  );
  readonly companyInactiveCount = computed(() => this.total() - this.companyActiveCount());

  /** HR lifecycle breakdown, keyed by status in display order. */
  readonly hrStatusCounts = computed<Record<HrProcessStatus, number>>(() => {
    const counts = { Pending: 0, Active: 0, Inactive: 0, Archived: 0 } as Record<
      HrProcessStatus,
      number
    >;
    for (const contact of this._contacts()) {
      counts[contact.hrProcessStatus] += 1;
    }
    return counts;
  });

  /** The most recently created contacts, newest first. */
  readonly latest = computed(() =>
    [...this._contacts()].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 5),
  );

  private load(): Contact[] {
    const stored = this.storage.read<Contact[]>(STORAGE_KEY);
    return Array.isArray(stored) ? stored : [];
  }

  /** Returns a defensive copy of a contact, or null when not found. */
  getById(id: string): Contact | null {
    const contact = this._contacts().find((entry) => entry.id === id);
    return contact ? { ...contact, name: { ...contact.name, middleNames: [...contact.name.middleNames] } } : null;
  }

  /** Name-search helper shared by lists and the header quick search. */
  matchesSearch(contact: Contact, term: string): boolean {
    const needle = term.trim().toLowerCase();
    if (needle === '') {
      return true;
    }
    const haystack = [
      contact.name.rawFullName,
      contact.name.firstName,
      contact.name.lastName,
      ...contact.name.middleNames,
      contact.name.shortTitle ?? '',
      contact.name.longTitle ?? '',
      composeFullName(contact.name),
      contact.email,
      contact.phone,
      contact.city,
      contact.jobTitle,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  }

  /** Creates a contact, persists it and returns the stored entity. */
  create(draft: Omit<Contact, 'id' | 'addedAt' | 'updatedAt'>): Contact | null {
    const contact: Contact = {
      ...draft,
      id: generateId(),
      addedAt: nowIso(),
      updatedAt: nowIso(),
    };
    if (!this.persist([contact, ...this._contacts()])) {
      return null;
    }
    return contact;
  }

  /** Updates an existing contact and refreshes its updatedAt timestamp. */
  update(id: string, changes: Partial<Omit<Contact, 'id' | 'addedAt'>>): Contact | null {
    const previous = this.getById(id);
    if (!previous) {
      return null;
    }
    const updated: Contact = {
      ...previous,
      ...changes,
      id: previous.id,
      addedAt: previous.addedAt,
      updatedAt: nowIso(),
    };
    if (!this.persist(this._contacts().map((entry) => (entry.id === id ? updated : entry)))) {
      return null;
    }
    return updated;
  }

  remove(id: string): boolean {
    if (!this._contacts().some((entry) => entry.id === id)) {
      return false;
    }
    return this.persist(this._contacts().filter((entry) => entry.id !== id));
  }

  /** Toggles the favorite flag and returns the updated contact. */
  toggleFavorite(id: string): Contact | null {
    const contact = this.getById(id);
    if (!contact) {
      return null;
    }
    return this.update(id, { favorite: !contact.favorite });
  }

  /**
   * Replaces the whole state (used by the JSON import feature).
   * Returns true when the snapshot was persisted.
   */
  replaceAll(contacts: Contact[]): boolean {
    if (!Array.isArray(contacts)) {
      return false;
    }
    return this.persist(contacts);
  }

  /** All contacts belonging to a given category. */
  getByCategory(categoryId: string): Contact[] {
    return this._contacts().filter((contact) => contact.categoryId === categoryId);
  }

  /** All contacts assigned to a company, regardless of activity. */
  getByCompany(companyId: string): Contact[] {
    return this._contacts().filter((contact) => contact.companyId === companyId);
  }

  /** True when a write to localStorage failed since construction. */
  get persistFailed(): boolean {
    return this.lastPersistFailed();
  }

  private persist(contacts: Contact[]): boolean {
    const ok = this.storage.write(STORAGE_KEY, contacts);
    this.lastPersistFailed.set(!ok);
    if (ok) {
      this._contacts.set(contacts);
    }
    return ok;
  }
}
