import { Injectable, computed, inject, signal } from '@angular/core';
import { ThreatAssessment, ThreatAssessmentDraft } from '../models/phase2/threat-assessment.model';
import { StorageService } from './storage.service';
import { generateId, nowIso } from '../utils/id';

const STORAGE_KEY = 'threatAssessments';

/**
 * Single source of truth for Phase-2 company-threat evaluations. Each
 * assessment is bound to one contact (the subject of concern) with an
 * optional company context, and structured after the Virginia DCJS
 * threat assessment and management reference form.
 */
@Injectable({ providedIn: 'root' })
export class ThreatAssessmentService {
  private readonly storage = inject(StorageService);

  private readonly _assessments = signal<ThreatAssessment[]>(this.load());

  /** Read-only list of all threat assessments. */
  readonly assessments = this._assessments.asReadonly();

  readonly total = computed(() => this._assessments().length);

  /** Assessment count per overall threat level. */
  readonly countByThreatLevel = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of this._assessments()) {
      counts.set(entry.overallThreat, (counts.get(entry.overallThreat) ?? 0) + 1);
    }
    return counts;
  });

  private load(): ThreatAssessment[] {
    const stored = this.storage.read<ThreatAssessment[]>(STORAGE_KEY);
    return Array.isArray(stored) ? stored : [];
  }

  getById(id: string): ThreatAssessment | null {
    const entry = this._assessments().find((candidate) => candidate.id === id);
    return entry ? { ...entry } : null;
  }

  /** All assessments for a given subject contact. */
  assessmentsForContact(contactId: string): ThreatAssessment[] {
    return this._assessments()
      .filter((entry) => entry.contactId === contactId)
      .map((entry) => ({ ...entry }));
  }

  /** Records a new assessment with its creation timestamp. */
  create(draft: ThreatAssessmentDraft): ThreatAssessment {
    const created: ThreatAssessment = {
      ...draft,
      id: generateId(),
      createdAt: nowIso(),
    };
    this.persist([created, ...this._assessments()]);
    return created;
  }

  /** Applies partial changes; returns null when the assessment does not exist. */
  update(id: string, changes: Partial<ThreatAssessmentDraft>): ThreatAssessment | null {
    const previous = this.getById(id);
    if (!previous) {
      return null;
    }
    const updated: ThreatAssessment = {
      ...previous,
      ...changes,
      id: previous.id,
      createdAt: previous.createdAt,
    };
    return this.persist(
      this._assessments().map((entry) => (entry.id === id ? updated : entry)),
    )
      ? updated
      : null;
  }

  remove(id: string): boolean {
    if (!this._assessments().some((entry) => entry.id === id)) {
      return false;
    }
    return this.persist(this._assessments().filter((entry) => entry.id !== id));
  }

  /** Replaces the whole state (used by the JSON import feature). */
  replaceAll(assessments: ThreatAssessment[]): boolean {
    return Array.isArray(assessments) ? this.persist(assessments) : false;
  }

  private persist(assessments: ThreatAssessment[]): boolean {
    const ok = this.storage.write(STORAGE_KEY, assessments);
    if (ok) {
      this._assessments.set(assessments);
    }
    return ok;
  }
}
