import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { I18nService } from './core/services/i18n.service';
import { TranslatePipe } from './core/pipes/translate.pipe';
import { ContactService } from './core/services/contact.service';
import { CategoryService } from './core/services/category.service';
import { VCardService, toContactDraft, ParsedVCard } from './core/services/vcard.service';
import { CompanyService } from './core/services/company.service';

/** Application shell: header with navigation, router outlet and footer. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly themeService = inject(ThemeService);
  protected readonly i18n = inject(I18nService);
  private readonly contactService = inject(ContactService);
  private readonly categoryService = inject(CategoryService);
  private readonly companyService = inject(CompanyService);
  private readonly vcardService = inject(VCardService);

  /** Transient toast message for vCard import feedback. */
  protected readonly toast = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Reads a .vcf file from the header picker, turns each card into a
   * contact draft (categories are re-attached by name when they already
   * exist) and appends the contacts to the local repository.
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
