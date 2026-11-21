import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { I18nService } from './core/services/i18n.service';
import { TranslatePipe } from './core/pipes/translate.pipe';
import { ContactService } from './core/services/contact.service';
import { CategoryService } from './core/services/category.service';
import { DataTransferService } from './core/services/data-transfer.service';
import { VCardService, toContactDraft, ParsedVCard } from './core/services/vcard.service';
import { CompanyService } from './core/services/company.service';
import { Contact } from './core/models/contact.model';
import { DataSnapshot } from './core/models/snapshot.model';
import { SCHEMA_VERSION } from './core/services/migration.service';
import { DebounceInputDirective } from './core/directives/debounce-input.directive';
import { FullNamePipe } from './core/pipes/full-name.pipe';
import { InitialsPipe } from './core/pipes/initials.pipe';

/** Application shell: header (search, import/export), sidebar and footer. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    DebounceInputDirective,
    FullNamePipe,
    InitialsPipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly themeService = inject(ThemeService);
  protected readonly i18n = inject(I18nService);
  private readonly contactService = inject(ContactService);
  private readonly categoryService = inject(CategoryService);
  private readonly companyService = inject(CompanyService);
  private readonly dataTransfer = inject(DataTransferService);
  private readonly vcardService = inject(VCardService);
  private readonly router = inject(Router);

  /** Transient toast message shared by all header import/export actions. */
  protected readonly toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Header quick search ──────────────────────────────────────────────
  /** Debounced term emitted by appDebounceInput on the search input. */
  readonly quickSearch = signal('');
  readonly searchOpen = signal(false);

  /** Top matches across name tokens, email, phone, city and job title. */
  readonly quickResults = computed<Contact[]>(() => {
    const term = this.quickSearch();
    if (term.trim() === '') {
      return [];
    }
    return this.contactService
      .contacts()
      .filter((contact) => this.contactService.matchesSearch(contact, term))
      .slice(0, 6);
  });

  constructor() {
    // Close the results when the pointer leaves the search box. Registered
    // at document level with cleanup, as the shell outlives every route.
    const onDocumentClick = (event: MouseEvent): void => {
      if (!(event.target instanceof Element)) {
        return;
      }
      if (!event.target.closest('.quick-search')) {
        this.searchOpen.set(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        this.searchOpen.set(false);
      }
    };
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
    });
  }

  onSearchTerm(term: string): void {
    this.quickSearch.set(term);
    this.searchOpen.set(term.trim() !== '');
  }

  /** Navigates to the picked contact and clears the search state. */
  goToContact(contact: Contact): void {
    this.searchOpen.set(false);
    this.quickSearch.set('');
    void this.router.navigate(['/contacts', contact.id]);
  }

  /** Enter selects the first visible result, Escape already closes via the listener. */
  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.quickResults().length > 0) {
      event.preventDefault();
      this.goToContact(this.quickResults()[0]);
    }
  }

  // ── JSON full-database triggers ──────────────────────────────────────

  /** Exports the complete snapshot (contacts + categories + companies). */
  protected exportJson(): void {
    const snapshot: DataSnapshot = {
      schemaVersion: SCHEMA_VERSION,
      categories: this.categoryService.categories(),
      companies: this.companyService.companies(),
      contacts: this.contactService.contacts(),
    };
    this.dataTransfer.export(snapshot);
    this.showToast(this.i18n.translate('contacts.exported'));
  }

  /** Replaces the whole local state from a schema-validated snapshot file. */
  protected async importJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      const snapshot = await this.dataTransfer.import(file);
      if (
        !this.categoryService.replaceAll({ categories: snapshot.categories }) ||
        !this.companyService.replaceAll(snapshot.companies) ||
        !this.contactService.replaceAll(snapshot.contacts)
      ) {
        throw new Error('persist');
      }
      this.showToast(this.i18n.translate('contacts.imported'));
    } catch (error) {
      // The validator already produced a descriptive message when it can.
      this.showToast(
        error instanceof Error && error.message
          ? error.message
          : this.i18n.translate('contacts.importInvalid'),
      );
    }
  }

  // ── vCard import ─────────────────────────────────────────────────────

  /**
   * Reads a .vcf file from the header picker, turns each card into a
   * contact draft (categories/companies are re-attached BY NAME when
   * they already exist) and appends the contacts to the repository.
   */
  protected async importVCard(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      const content = await file.text();
      const cards = this.vcardService.parse(content);
      if (cards.length === 0) {
        this.showToast(this.i18n.translate('contacts.vcardNone'));
        return;
      }
      for (const card of cards) {
        this.contactService.create(
          toContactDraft(card, this.resolveCategoryId(card), this.resolveCompanyId(card)),
        );
      }
      this.showToast(this.i18n.translate('contacts.vcardImported'));
    } catch {
      // Malformed file: the failure message replaces any previous toast.
      this.showToast(this.i18n.translate('contacts.importInvalid'));
    }
  }

  /** Matches the card's CATEGORIES value against existing category names. */
  private resolveCategoryId(card: ParsedVCard): string | null {
    const wanted = card.categoryName.trim().toLowerCase();
    if (!wanted) {
      return null;
    }
    const match = this.categoryService
      .categories()
      .find(
        (category) =>
          category.name.en.trim().toLowerCase() === wanted ||
          category.name.fr.trim().toLowerCase() === wanted,
      );
    return match?.id ?? null;
  }

  /**
   * Matches the card's ORG value against existing company names
   * (case-insensitive). Unknown companies stay unassigned — they are
   * not auto-created so imports never fabricate rows.
   */
  private resolveCompanyId(card: ParsedVCard): string | null {
    const wanted = card.company.trim().toLowerCase();
    if (!wanted) {
      return null;
    }
    const match = this.companyService
      .companies()
      .find((company) => company.name.trim().toLowerCase() === wanted);
    return match?.id ?? null;
  }

  private showToast(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
  }
}
