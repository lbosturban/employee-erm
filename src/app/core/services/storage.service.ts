import { Injectable, signal } from '@angular/core';

/**
 * Thin wrapper around window.localStorage providing JSON serialization,
 * namespaced keys and safe error handling. Domain services build on top
 * of it, which keeps the persistence layer swappable (e.g. future backend).
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private static readonly NAMESPACE = 'contacts-erm';

  /** Number of keys written, exposed for tests and dashboards. */
  private readonly writeCount = signal(0);

  get writes(): number {
    return this.writeCount();
  }

  read<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(this.fullKey(key));
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (error) {
      // Corrupted payload or unavailable storage: degrade gracefully.
      console.warn(`[StorageService] Failed to read "${key}"`, error);
      return null;
    }
  }

  write<T>(key: string, value: T): boolean {
    try {
      window.localStorage.setItem(this.fullKey(key), JSON.stringify(value));
      this.writeCount.update((count) => count + 1);
      return true;
    } catch (error) {
      // Quota exceeded or storage disabled (private mode): surface a failure
      // instead of silently losing data.
      console.error(`[StorageService] Failed to write "${key}"`, error);
      return false;
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(this.fullKey(key));
    } catch (error) {
      console.warn(`[StorageService] Failed to remove "${key}"`, error);
    }
  }

  private fullKey(key: string): string {
    return `${StorageService.NAMESPACE}:${key}`;
  }
}
