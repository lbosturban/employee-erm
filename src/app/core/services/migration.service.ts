import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { buildSeedData } from './seed-data';

/**
 * Current localStorage schema version. Bump this whenever a domain
 * model changes, and (when keeping data is desired) add an upgrade step
 * instead of relying on the wipe path.
 */
export const SCHEMA_VERSION = 2;

const VERSION_KEY = 'schemaVersion';

/**
 * Owns the schema lifecycle of localStorage.
 *
 * Strategy chosen for this build ("wipe & reseed"): when the stored
 * schema version is missing or older than {@link SCHEMA_VERSION}, every
 * namespaced key is dropped and the rich sample dataset is written.
 * No upgrade functions are needed yet, but the versioning scaffold is
 * here so a future migration can insert per-version upgraders in
 * {@link upgrades} without touching domain services.
 */
@Injectable({ providedIn: 'root' })
export class MigrationService {
  private readonly storage = inject(StorageService);

  private readonly _migrated = signal(false);
  /** True once a schema reset (or fresh seed) happened in this session. */
  readonly freshlySeeded = this._migrated.asReadonly();

  /** Keys wiped when a schema mismatch is detected. */
  private static readonly DOMAIN_KEYS = [
    'contacts',
    'categories',
    'companies',
    'lang',
    'theme',
  ] as const;

  /**
   * Ordered, pure schema upgraders: keys are the version to upgrade
   * *from*. Empty today — the wipe-and-reseed path covers all changes.
   */
  private static readonly upgrades: Record<number, () => void> = {};

  /** Must run once, before any domain service reads localStorage. */
  run(): void {
    const stored = this.storage.read<number>(VERSION_KEY);
    if (stored === SCHEMA_VERSION) {
      return;
    }
    if (stored !== null && stored < SCHEMA_VERSION && MigrationService.upgrades[stored]) {
      // Walk every available upgrade step in order (future-proof path).
      for (let version = stored; version < SCHEMA_VERSION; version += 1) {
        MigrationService.upgrades[version]?.();
      }
      this.storage.write(VERSION_KEY, SCHEMA_VERSION);
      return;
    }
    // Unknown, missing or incompatible version: wipe everything and reseed.
    this.storage.clearNamespace();
    this.seed();
    this.storage.write(VERSION_KEY, SCHEMA_VERSION);
    this._migrated.set(true);
  }

  /** Writes the initial sample dataset into storage. */
  private seed(): void {
    const { categories, companies, contacts } = buildSeedData();
    this.storage.write('categories', categories);
    this.storage.write('companies', companies);
    this.storage.write('contacts', contacts);
  }
}
