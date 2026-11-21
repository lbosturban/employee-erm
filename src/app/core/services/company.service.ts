import { Injectable, computed, inject, signal } from '@angular/core';
import { Company, CompanyDraft } from '../models/company.model';
import { ContactService } from './contact.service';
import { StorageService } from './storage.service';
import { generateId, nowIso } from '../utils/id';

const STORAGE_KEY = 'companies';

/** Outcome of a removal attempt: blocked while contacts still reference it. */
export type RemoveCompanyResult = 'removed' | 'notFound' | 'inUse';

/**
 * Single source of truth for CRM-managed companies. Contacts reference
 * companies by id, so — like categories — a company cannot be deleted
 * while at least one contact still references it. The managed
 * vocabularies (sizes, business structures, sectors) live in the model
 * file as typed constants and do not need persistence.
 */
@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly storage = inject(StorageService);
  private readonly contactService = inject(ContactService);

  private readonly _companies = signal<Company[]>(this.load());

  /** Read-only list of all companies. */
  readonly companies = this._companies.asReadonly();

  readonly total = computed(() => this._companies().length);

  /**
   * Contacts count per company id. Consumed by the companies page and
   * used to guard deletions.
   */
  readonly usageByCompany = computed(() => {
    const usage = new Map<string, number>();
    for (const contact of this.contactService.contacts()) {
      if (contact.companyId !== null) {
        usage.set(contact.companyId, (usage.get(contact.companyId) ?? 0) + 1);
      }
    }
    return usage;
  });

  private load(): Company[] {
    const stored = this.storage.read<Company[]>(STORAGE_KEY);
    return Array.isArray(stored) ? stored : [];
  }

  getById(id: string): Company | null {
    const company = this._companies().find((entry) => entry.id === id);
    return company ? { ...company } : null;
  }

  /** Creates a company; returns null when the name is already taken. */
  create(draft: CompanyDraft): Company | null {
    if (this.exists(draft.name)) {
      return null;
    }
    const company: Company = {
      ...draft,
      name: draft.name.trim(),
      id: generateId(),
      createdAt: nowIso(),
    };
    if (!this.persist([company, ...this._companies()])) {
      return null;
    }
    return company;
  }

  /** Returns null when the company does not exist or a name is taken. */
  update(id: string, changes: Partial<CompanyDraft>): Company | null {
    const previous = this.getById(id);
    if (!previous) {
      return null;
    }
    const mergedName = (changes.name ?? previous.name).trim();
    if (this.exists(mergedName, id)) {
      return null;
    }
    const updated: Company = {
      ...previous,
      ...changes,
      name: mergedName,
      id: previous.id,
      businessStructure: changes.businessStructure ?? previous.businessStructure,
      sector: changes.sector ?? previous.sector,
      size: changes.size ?? previous.size,
      contactId: changes.contactId === undefined ? previous.contactId : changes.contactId,
    };
    if (!this.persist(this._companies().map((entry) => (entry.id === id ? updated : entry)))) {
      return null;
    }
    return updated;
  }

  /**
   * Deletes a company unless at least one contact still references it —
   * mirrored protection to the category deletion rule.
   */
  remove(id: string): RemoveCompanyResult {
    if (!this._companies().some((entry) => entry.id === id)) {
      return 'notFound';
    }
    if (this.usageByCompany().get(id)) {
      return 'inUse';
    }
    return this.persist(this._companies().filter((entry) => entry.id !== id))
      ? 'removed'
      : 'notFound';
  }

  /** Case-insensitive name uniqueness check (optional self-exclusion). */
  exists(name: string, excludeId?: string): boolean {
    const candidate = name.trim().toLowerCase();
    if (candidate === '') {
      return false;
    }
    return this._companies().some(
      (entry) => entry.id !== excludeId && entry.name.trim().toLowerCase() === candidate,
    );
  }

  /** Replaces the whole state (used by the JSON import feature). */
  replaceAll(companies: Company[]): boolean {
    if (!Array.isArray(companies)) {
      return false;
    }
    return this.persist(companies);
  }

  private persist(companies: Company[]): boolean {
    const ok = this.storage.write(STORAGE_KEY, companies);
    if (ok) {
      this._companies.set(companies);
    }
    return ok;
  }
}
