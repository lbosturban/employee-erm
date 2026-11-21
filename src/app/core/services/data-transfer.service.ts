import { Injectable } from '@angular/core';
import { Contact } from '../models/contact.model';
import { Category, BilingualText } from '../models/category.model';
import { DataSnapshot } from './contact.service';

/**
 * Import/export of the full data set (contacts + categories) as a JSON
 * file. Keeping this in a dedicated service makes the exchange format
 * testable and reusable by a future backend synchronization layer.
 */
@Injectable({ providedIn: 'root' })
export class DataTransferService {
  /** Triggers a browser download of the snapshot as `contacts-erm-export.json`. */
  export(snapshot: DataSnapshot): void {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'contacts-erm-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Reads and validates a JSON file produced by `export`.
   * Resolves with the snapshot, or rejects with a descriptive error.
   */
  import(file: File): Promise<DataSnapshot> {
    return file
      .text()
      .then((raw) => this.parse(raw))
      .catch((error: unknown) => {
        throw new Error(error instanceof Error ? error.message : 'Invalid JSON file');
      });
  }

  private parse(raw: string): DataSnapshot {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('Invalid JSON file');
    }
    if (!isSnapshot(data)) {
      throw new Error('Invalid JSON file');
    }
    return data;
  }
}

/** Runtime shape validation, standing in for a future schema check. */
function isSnapshot(data: unknown): data is DataSnapshot {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const { contacts, categories } = data as Partial<DataSnapshot>;
  return Array.isArray(contacts) && Array.isArray(categories);
}

export function isContact(value: unknown): value is Contact {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const contact = value as Partial<Contact>;
  return (
    typeof contact.id === 'string' &&
    typeof contact.firstName === 'string' &&
    typeof contact.lastName === 'string'
  );
}

export function isCategory(value: unknown): value is Category {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const category = value as Partial<Category>;
  return (
    typeof category.id === 'string' &&
    isValidCategoryName(category.name) &&
    typeof category.color === 'string'
  );
}

/** Accepts the bilingual shape ({ en, fr }) and legacy plain string names. */
function isValidCategoryName(name: unknown): boolean {
  if (typeof name === 'string') {
    return name.trim().length > 0;
  }
  if (typeof name !== 'object' || name === null) {
    return false;
  }
  const bilingual = name as Partial<BilingualText>;
  return (
    (typeof bilingual.en === 'string' && bilingual.en.trim().length > 0) ||
    (typeof bilingual.fr === 'string' && bilingual.fr.trim().length > 0)
  );
}
