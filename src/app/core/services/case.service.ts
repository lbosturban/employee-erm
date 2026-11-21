import { Injectable, computed, inject, signal } from '@angular/core';
import { CrmCase, CrmCaseDraft } from '../models/phase2/case.model';
import { StorageService } from './storage.service';
import { generateId, nowIso } from '../utils/id';

const STORAGE_KEY = 'cases';

/**
 * Single source of truth for Phase-2 ERM cases. Unlike categories or
 * companies, cases are standalone records: they may freely reference
 * contacts (removed contacts simply leave dangling ids that the pages
 * render as "unknown contact") so no delete protection is required.
 */
@Injectable({ providedIn: 'root' })
export class CaseService {
  private readonly storage = inject(StorageService);

  private readonly _cases = signal<CrmCase[]>(this.load());

  /** Read-only list of all cases. */
  readonly cases = this._cases.asReadonly();

  readonly total = computed(() => this._cases().length);

  /** Case count per kind (irritant / conflict / complaint / mediation). */
  readonly countByKind = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of this._cases()) {
      counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
    }
    return counts;
  });

  /** Case count per lifecycle status (open / observed / resolved). */
  readonly countByStatus = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of this._cases()) {
      counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
    }
    return counts;
  });

  private load(): CrmCase[] {
    const stored = this.storage.read<CrmCase[]>(STORAGE_KEY);
    return Array.isArray(stored) ? stored : [];
  }

  getById(id: string): CrmCase | null {
    const entry = this._cases().find((candidate) => candidate.id === id);
    return entry ? { ...entry } : null;
  }

  /** Cases in which the given contact is concerned (any position). */
  casesForContact(contactId: string): CrmCase[] {
    return this._cases()
      .filter((entry) => entry.contactIds.includes(contactId))
      .map((entry) => ({ ...entry }));
  }

  /** Records a new case with automatic timestamps. */
  create(draft: CrmCaseDraft): CrmCase {
    const created: CrmCase = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      id: generateId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.persist([created, ...this._cases()]);
    return created;
  }

  /** Applies partial changes; returns null when the case does not exist. */
  update(id: string, changes: Partial<CrmCaseDraft>): CrmCase | null {
    const previous = this.getById(id);
    if (!previous) {
      return null;
    }
    const updated: CrmCase = {
      ...previous,
      ...changes,
      id: previous.id,
      createdAt: previous.createdAt,
      updatedAt: nowIso(),
    };
    return this.persist(this._cases().map((entry) => (entry.id === id ? updated : entry)))
      ? updated
      : null;
  }

  remove(id: string): boolean {
    if (!this._cases().some((entry) => entry.id === id)) {
      return false;
    }
    return this.persist(this._cases().filter((entry) => entry.id !== id));
  }

  /** Replaces the whole state (used by the JSON import feature). */
  replaceAll(cases: CrmCase[]): boolean {
    return Array.isArray(cases) ? this.persist(cases) : false;
  }

  private persist(cases: CrmCase[]): boolean {
    const ok = this.storage.write(STORAGE_KEY, cases);
    if (ok) {
      this._cases.set(cases);
    }
    return ok;
  }
}
