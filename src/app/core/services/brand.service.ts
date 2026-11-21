import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Which brand identity the shell currently displays. */
export type BrandMode = 'crm' | 'erm';

/**
 * Derives the brand mode from a router URL. Every Phase-2 (ERM) feature
 * lives under the `/erm` prefix, so a single prefix check decides the
 * brand without walking the route tree. Exported for unit testing.
 */
export function brandModeFromUrl(url: string): BrandMode {
  return url === '/erm' || url.startsWith('/erm/') || url.startsWith('/erm?') ? 'erm' : 'crm';
}

/**
 * Switches the shell brand (logo + title) between the CRM ("Contacts
 * ERM") and the ERM product line ("Connects ERM") depending on whether
 * the routing table activated a Phase-2 `/erm/*` route. The tagline is
 * intentionally NOT switched: it is shared by both product lines.
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

  /** Reactive brand mode, `'crm'` until an `/erm/*` route activates. */
  readonly brandMode = this.mode.asReadonly();

  /** True while a Phase-2 (ERM) route is active. */
  readonly isErm = computed(() => this.mode() === 'erm');

  /** Header logo asset for the active brand mode. The ERM art is a
   *  placeholder (`connects-erm.svg`) awaiting the final logo file. */
  readonly logo = computed(() => (this.isErm() ? 'connects-erm.svg' : 'contacts-erm.svg'));

  /** I18n dictionary key of the brand title for the active mode. */
  readonly titleKey = computed(() => (this.isErm() ? 'app.titleErm' : 'app.title'));
}
