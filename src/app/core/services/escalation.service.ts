import { Injectable, computed, inject, signal } from '@angular/core';
import { Escalation, EscalationDraft } from '../models/phase2/escalation.model';
import { StorageService } from './storage.service';
import { generateId, nowIso } from '../utils/id';

const STORAGE_KEY = 'escalations';

/**
 * Single source of truth for Phase-2 ERM escalation steps. Each
 * escalation records one step of the hierarchical ladder
 * (Superiors → Management → HR → Legal Department) from a source
 * contact to a target contact, optionally anchored to the mediation
 * case that motivated it. Dangling contact references after contact
 * removals are tolerated and rendered as "unknown contact".
 */
@Injectable({ providedIn: 'root' })
export class EscalationService {
  private readonly storage = inject(StorageService);

  private readonly _escalations = signal<Escalation[]>(this.load());

  /** Read-only list of all escalations. */
  readonly escalations = this._escalations.asReadonly();

  readonly total = computed(() => this._escalations().length);

  /** Escalation count per purpose classification. */
  readonly countByPurpose = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of this._escalations()) {
      counts.set(entry.purpose, (counts.get(entry.purpose) ?? 0) + 1);
    }
    return counts;
  });

  private load(): Escalation[] {
    const stored = this.storage.read<Escalation[]>(STORAGE_KEY);
    return Array.isArray(stored) ? stored : [];
  }

  getById(id: string): Escalation | null {
    const entry = this._escalations().find((candidate) => candidate.id === id);
    return entry ? { ...entry } : null;
  }

  /** Escalations where the contact is on the source OR the target side. */
  escalationsForContact(contactId: string): Escalation[] {
    return this._escalations()
      .filter(
        (entry) => entry.sourceContactId === contactId || entry.targetContactId === contactId,
      )
      .map((entry) => ({ ...entry }));
  }

  /** Records a new escalation step with its creation timestamp. */
  create(draft: EscalationDraft): Escalation {
    const created: Escalation = {
      ...draft,
      notes: draft.notes.trim(),
      id: generateId(),
      createdAt: nowIso(),
    };
    this.persist([created, ...this._escalations()]);
    return created;
  }

  /** Applies partial changes; returns null when the escalation does not exist. */
  update(id: string, changes: Partial<EscalationDraft>): Escalation | null {
    const previous = this.getById(id);
    if (!previous) {
      return null;
    }
    const updated: Escalation = {
      ...previous,
      ...changes,
      id: previous.id,
      createdAt: previous.createdAt,
    };
    return this.persist(this._escalations().map((entry) => (entry.id === id ? updated : entry)))
      ? updated
      : null;
  }

  remove(id: string): boolean {
    if (!this._escalations().some((entry) => entry.id === id)) {
      return false;
    }
    return this.persist(this._escalations().filter((entry) => entry.id !== id));
  }

  /** Replaces the whole state (used by the JSON import feature). */
  replaceAll(escalations: Escalation[]): boolean {
    return Array.isArray(escalations) ? this.persist(escalations) : false;
  }

  private persist(escalations: Escalation[]): boolean {
    const ok = this.storage.write(STORAGE_KEY, escalations);
    if (ok) {
      this._escalations.set(escalations);
    }
    return ok;
  }
}
