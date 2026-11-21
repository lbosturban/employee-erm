import { Injectable, computed, inject, signal } from '@angular/core';
import { Category, BilingualText } from '../models/category.model';
import { ContactService } from './contact.service';
import { StorageService } from './storage.service';
import { generateId, nowIso } from '../utils/id';

/** Data needed to create a category (id and timestamp are generated). */
export type CategoryDraft = Pick<Category, 'name' | 'color'>;

const STORAGE_KEY = 'categories';

/** Outcome of a removal attempt: blocked when contacts still reference it. */
export type RemoveCategoryResult = 'removed' | 'notFound' | 'inUse';

/**
 * Single source of truth for categories, persisted through StorageService.
 * Names are bilingual (EN/FR); deletion is atomic with the contact
 * repository: a category cannot be removed while at least one contact
 * references it.
 */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly storage = inject(StorageService);
  private readonly contactService = inject(ContactService);

  private readonly _categories = signal<Category[]>(this.load());

  /** Read-only list of all categories. */
  readonly categories = this._categories.asReadonly();

  readonly total = computed(() => this._categories().length);

  /**
   * Usage count per category id. Consumed by the dashboard and used to
   * guard deletions, so it must always stay in sync with ContactService.
   */
  readonly usageByCategory = computed(() => {
    const usage = new Map<string, number>();
    for (const contact of this.contactService.contacts()) {
      if (contact.categoryId !== null) {
        usage.set(contact.categoryId, (usage.get(contact.categoryId) ?? 0) + 1);
      }
    }
    return usage;
  });

  private load(): Category[] {
    const stored = this.storage.read<Category[]>(STORAGE_KEY);
    if (Array.isArray(stored)) {
      // One-time migration: older exports stored plain string names.
      return stored.map((entry) => {
        const rawName: unknown = entry?.name;
        const name: BilingualText =
          typeof rawName === 'string'
            ? { en: rawName, fr: rawName }
            : ((rawName as BilingualText) ?? { en: '', fr: '' });
        return { ...entry, name };
      });
    }
    // ContactService seeds the default categories on first launch; if it
    // has not run yet there is nothing to load.
    return [];
  }

  getById(id: string): Category | null {
    const category = this._categories().find((entry) => entry.id === id);
    return category ? { ...category } : null;
  }

  create(draft: CategoryDraft): Category | null {
    if (this.exists(draft.name)) {
      return null;
    }
    const category: Category = {
      ...draft,
      name: normalizeName(draft.name),
      id: generateId(),
      createdAt: nowIso(),
    };
    if (!this.persist([category, ...this._categories()])) {
      return null;
    }
    return category;
  }

  /** Returns null when the category does not exist or a name is taken. */
  update(id: string, changes: Partial<CategoryDraft>): Category | null {
    const previous = this.getById(id);
    if (!previous) {
      return null;
    }
    // Merge a partial bilingual name with the previous one, then guard
    // against duplicates in both languages before persisting.
    const name: BilingualText = {
      en: changes.name?.en ?? previous.name.en,
      fr: changes.name?.fr ?? previous.name.fr,
    };
    if (this.exists(name, id)) {
      return null;
    }
    const updated: Category = {
      ...previous,
      ...changes,
      name,
      id: previous.id,
    };
    if (!this.persist(this._categories().map((entry) => (entry.id === id ? updated : entry)))) {
      return null;
    }
    return updated;
  }

  /**
   * Deletes a category unless contacts still use it, forcing callers to
   * repatriate those contacts first.
   */
  remove(id: string): RemoveCategoryResult {
    if (!this._categories().some((entry) => entry.id === id)) {
      return 'notFound';
    }
    if (this.usageByCategory().get(id)) {
      return 'inUse';
    }
    return this.persist(this._categories().filter((entry) => entry.id !== id))
      ? 'removed'
      : 'notFound';
  }

  /**
   * Case-insensitive uniqueness across both languages: a candidate is a
   * duplicate when its EN or FR name matches an existing EN or FR name.
   */
  exists(name: BilingualText, excludeId?: string): boolean {
    const candidates = [name.en, name.fr]
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0);
    if (candidates.length === 0) {
      return false;
    }
    return this._categories().some((entry) => {
      if (entry.id === excludeId) {
        return false;
      }
      const existing = [entry.name.en, entry.name.fr].map((value) => value.trim().toLowerCase());
      return candidates.some((value) => existing.includes(value));
    });
  }

  /** Replaces the whole state (used by the JSON import feature). */
  replaceAll(snapshot: { categories: Category[] }): boolean {
    if (!Array.isArray(snapshot.categories)) {
      return false;
    }
    return this.persist(snapshot.categories);
  }

  private persist(categories: Category[]): boolean {
    const ok = this.storage.write(STORAGE_KEY, categories);
    if (ok) {
      this._categories.set(categories);
    }
    return ok;
  }
}

function normalizeName(name: BilingualText): BilingualText {
  return { en: name.en.trim(), fr: name.fr.trim() };
}
