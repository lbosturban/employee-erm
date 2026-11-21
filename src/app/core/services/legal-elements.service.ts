import { Injectable, inject, signal } from '@angular/core';
import {
  LegalElementReference,
  LegalElementReferenceDraft,
  LegalElementsBundle,
  LegalElementsDraft,
  LegalSectionKind,
} from '../models/phase2/legal-elements.model';
import { StorageService } from './storage.service';
import { generateId, nowIso } from '../utils/id';

const STORAGE_KEY = 'legalElementsBundles';

/**
 * Single source of truth for Phase-2 legal-elements bundles. A bundle
 * groups structured references (contracts, Labour Code articles,
 * internal policies, further documentation) attached to one contact.
 * By design it does NOT link to external legal databases yet: entries
 * can only record where an element lives and an optional URL.
 */
@Injectable({ providedIn: 'root' })
export class LegalElementsService {
  private readonly storage = inject(StorageService);

  private readonly _bundles = signal<LegalElementsBundle[]>(this.load());

  /** Read-only list of all bundles. */
  readonly bundles = this._bundles.asReadonly();

  private load(): LegalElementsBundle[] {
    const stored = this.storage.read<LegalElementsBundle[]>(STORAGE_KEY);
    return Array.isArray(stored) ? stored : [];
  }

  getById(id: string): LegalElementsBundle | null {
    const entry = this._bundles().find((candidate) => candidate.id === id);
    return entry ? this.clone(entry) : null;
  }

  /** All bundles attached to a given contact. */
  bundlesForContact(contactId: string): LegalElementsBundle[] {
    return this._bundles().filter((entry) => entry.contactId === contactId).map(this.clone);
  }

  /** Creates an empty bundle; references are added through `addReference`. */
  create(draft: LegalElementsDraft): LegalElementsBundle {
    const created: LegalElementsBundle = {
      ...draft,
      id: generateId(),
      createdAt: nowIso(),
    };
    this.persist([created, ...this._bundles()]);
    return created;
  }

  /** Applies partial changes; returns null when the bundle does not exist. */
  update(id: string, changes: Partial<LegalElementsDraft>): LegalElementsBundle | null {
    const previous = this.getById(id);
    if (!previous) {
      return null;
    }
    const updated: LegalElementsBundle = {
      ...previous,
      ...changes,
      id: previous.id,
      createdAt: previous.createdAt,
    };
    return this.persist(this._bundles().map((entry) => (entry.id === id ? updated : entry)))
      ? updated
      : null;
  }

  /** Appends a reference to a bundle; null when the bundle does not exist. */
  addReference(bundleId: string, draft: LegalElementReferenceDraft): LegalElementReference | null {
    const previous = this.getById(bundleId);
    if (!previous) {
      return null;
    }
    const reference: LegalElementReference = { ...draft, id: generateId() };
    return this.persist(
      this._bundles().map((entry) =>
        entry.id === bundleId ? { ...entry, references: [...entry.references, reference] } : entry,
      ),
    )
      ? reference
      : null;
  }

  /** Removes one reference; false when the bundle or reference is unknown. */
  removeReference(bundleId: string, referenceId: string): boolean {
    const previous = this.getById(bundleId);
    if (!previous?.references.some((reference) => reference.id === referenceId)) {
      return false;
    }
    return this.persist(
      this._bundles().map((entry) =>
        entry.id === bundleId
          ? {
              ...entry,
              references: entry.references.filter(
                (reference) => reference.id !== referenceId,
              ),
            }
          : entry,
      ),
    );
  }

  /** References of a bundle filtered by its section taxonomy. */
  referencesBySection(
    bundle: LegalElementsBundle,
  ): Map<LegalSectionKind, LegalElementReference[]> {
    const grouped = new Map<LegalSectionKind, LegalElementReference[]>();
    for (const reference of bundle.references) {
      const bucket = grouped.get(reference.kind) ?? [];
      bucket.push(reference);
      grouped.set(reference.kind, bucket);
    }
    return grouped;
  }

  remove(id: string): boolean {
    if (!this._bundles().some((entry) => entry.id === id)) {
      return false;
    }
    return this.persist(this._bundles().filter((entry) => entry.id !== id));
  }

  /** Replaces the whole state (used by the JSON import feature). */
  replaceAll(bundles: LegalElementsBundle[]): boolean {
    return Array.isArray(bundles) ? this.persist(bundles) : false;
  }

  private clone(entry: LegalElementsBundle): LegalElementsBundle {
    return {
      ...entry,
      references: entry.references.map((reference) => ({ ...reference })),
    };
  }

  private persist(bundles: LegalElementsBundle[]): boolean {
    const ok = this.storage.write(STORAGE_KEY, bundles);
    if (ok) {
      this._bundles.set(bundles);
    }
    return ok;
  }
}
