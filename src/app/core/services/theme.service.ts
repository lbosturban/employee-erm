import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/**
 * Light/dark theme manager. The active theme is persisted in
 * localStorage and applied via a data-theme attribute consumed by
 * CSS custom properties in styles.css.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(StorageService);

  readonly theme = signal<Theme>(this.loadInitialTheme());

  constructor() {
    this.apply(this.theme());
  }

  toggle(): void {
    this.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    this.apply(theme);
    void this.storage.write(STORAGE_KEY, theme);
  }

  private loadInitialTheme(): Theme {
    const stored = this.storage.read<Theme>(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // No saved preference yet: honor the OS setting (unsupported in jsdom).
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  }

  private apply(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
