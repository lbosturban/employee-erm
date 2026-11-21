import { Injectable, computed, inject, signal } from '@angular/core';
import { Contact } from '../models/contact.model';
import { Category } from '../models/category.model';
import { StorageService } from './storage.service';
import { generateId, nowIso } from '../utils/id';

/** Payload shape used when importing a full data snapshot from JSON. */
export interface DataSnapshot {
  contacts: Contact[];
  categories: Category[];
}

/** Data needed to create a new contact (id and timestamps are generated). */
export type ContactDraft = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;

const STORAGE_KEY = 'contacts';

/**
 * Single source of truth for contacts. State is held in a signal and
 * mirrored to localStorage on every mutation. All access to contacts
 * goes through this service so a future backend can replace the
 * storage layer without touching feature code.
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

  /** The most recently created contacts, newest first. */
  readonly latest = computed(() =>
    [...this._contacts()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
  );

  private load(): Contact[] {
    const stored = this.storage.read<Contact[]>(STORAGE_KEY);
    return Array.isArray(stored) ? stored : this.seed();
  }

  /**
   * Small demo data set created on first launch so the application
   * is immediately meaningful.
   */
  private seed(): Contact[] {
    const categories: Category[] = [
      {
        id: generateId(),
        name: { en: 'Students', fr: 'Étudiants' },
        color: '#2563eb',
        createdAt: nowIso(),
      },
      {
        id: generateId(),
        name: { en: 'Companies', fr: 'Entreprises' },
        color: '#059669',
        createdAt: nowIso(),
      },
      {
        id: generateId(),
        name: { en: 'Partners', fr: 'Partenaires' },
        color: '#d97706',
        createdAt: nowIso(),
      },
    ];
    void this.storage.write('categories', categories);

    const base = nowIso();
    const contacts: Contact[] = [
      {
        id: generateId(),
        firstName: 'Amina',
        lastName: 'Diallo',
        email: 'amina.diallo@example.com',
        phone: '+33 6 12 34 56 78',
        company: '',
        jobTitle: 'Student',
        categoryId: categories[0].id,
        favorite: true,
        notes: 'Full-stack specialization, graduating in 2026.',
        createdAt: base,
        updatedAt: base,
      },
      {
        id: generateId(),
        firstName: 'Julien',
        lastName: 'Moreau',
        email: 'j.moreau@techwave.example.com',
        phone: '+33 1 44 55 66 77',
        company: 'TechWave',
        jobTitle: 'CTO',
        categoryId: categories[1].id,
        favorite: false,
        notes: 'Met at the Paris tech job fair.',
        createdAt: base,
        updatedAt: base,
      },
      {
        id: generateId(),
        firstName: 'Sofia',
        lastName: 'Bernard',
        email: 'sofia.bernard@novapart.example.com',
        phone: '+33 6 98 76 54 32',
        company: 'NovaPart',
        jobTitle: 'Partnership Manager',
        categoryId: categories[2].id,
        favorite: true,
        notes: 'Prefers email contact before 10am.',
        createdAt: base,
        updatedAt: base,
      },
    ];
    void this.storage.write(STORAGE_KEY, contacts);
    return contacts;
  }

  /** Returns a defensive copy of a contact, or null when not found. */
  getById(id: string): Contact | null {
    const contact = this._contacts().find((entry) => entry.id === id);
    return contact ? { ...contact } : null;
  }

  /** Creates a contact, persists it and returns the stored entity. */
  create(draft: ContactDraft): Contact | null {
    const contact: Contact = {
      ...draft,
      id: generateId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    if (!this.persist([contact, ...this._contacts()])) {
      return null;
    }
    return contact;
  }

  /** Updates an existing contact and refreshes its updatedAt timestamp. */
  update(id: string, changes: Partial<ContactDraft>): Contact | null {
    const previous = this.getById(id);
    if (!previous) {
      return null;
    }
    const updated: Contact = {
      ...previous,
      ...changes,
      id: previous.id,
      createdAt: previous.createdAt,
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
   * Returns true when the snapshot was valid and persisted.
   */
  replaceAll(snapshot: DataSnapshot): boolean {
    if (!Array.isArray(snapshot.contacts)) {
      return false;
    }
    return this.persist(snapshot.contacts);
  }

  /** All contacts belonging to a given category. */
  getByCategory(categoryId: string): Contact[] {
    return this._contacts().filter((contact) => contact.categoryId === categoryId);
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
