import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Which brand identity the shell currently displays. */
export type BrandMode = 'crm' | 'erm' | 'ai';

/**
 * Derives the brand mode from a router URL. The ERM product line lives
 * under `/erm/*` and the AI-Agent section under `/ai-agent*`, so two
 * prefix checks decide the brand without walking the route tree.
 * Exported for unit testing.
 */
export function brandModeFromUrl(url: string): BrandMode {
  if (url === '/ai-agent' || url.startsWith('/ai-agent/') || url.startsWith('/ai-agent?')) {
    return 'ai';
  }
  return url === '/erm' || url.startsWith('/erm/') || url.startsWith('/erm?') ? 'erm' : 'crm';
}

/**
 * Switches the whole shell brand (logo, title AND tagline) between the
 * three product lines: "Contacts ERM" (CRM), "Connects ERM" (ERM) and
 * "ERM AI Agent" (AI Agent section), using separate logos and taglines
 * per mode. The ERM logo (`connects-erm.svg`) and the AI logo
 * (`ai-agent.svg`, duplicated from the ERM placeholder) await their
 * final artwork under those filenames.
 */
@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly mode = signal<BrandMode>('crm');

  constructor() {
    const router = inject(Router);
    // Zoneless app: the signal update drives repaints; the subscription
    // only fires once per completed navigation.
    router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.mode.set(brandModeFromUrl(event.urlAfterRedirects)));
  }

  /** Reactive brand mode, `'crm'` until an `/erm/*` or `/ai-agent*` route activates. */
  readonly brandMode = this.mode.asReadonly();

  /** True while a Phase-2 (ERM) route is active. */
  readonly isErm = computed(() => this.mode() === 'erm');

  /** True while the Phase-3 (AI Agent) section is active. */
  readonly isAi = computed(() => this.mode() === 'ai');

  /** Header logo asset for the active brand mode. The ERM and AI art are
   *  placeholders awaiting the final logo files (same filenames). */
  readonly logo = computed(() => {
    switch (this.mode()) {
      case 'ai':
        return 'ai-agent.svg';
      case 'erm':
        return 'connects-erm.svg';
      default:
        return 'contacts-erm.svg';
    }
  });

  /** I18n dictionary key of the brand title for the active mode. */
  readonly titleKey = computed(() => {
    switch (this.mode()) {
      case 'ai':
        return 'app.titleAi';
      case 'erm':
        return 'app.titleErm';
      default:
        return 'app.title';
    }
  });

  /** I18n dictionary key of the brand tagline for the active mode. */
  readonly taglineKey = computed(() => {
    switch (this.mode()) {
      case 'ai':
        return 'app.taglineAi';
      case 'erm':
        return 'app.taglineErm';
      default:
        return 'app.tagline';
    }
  });
}
