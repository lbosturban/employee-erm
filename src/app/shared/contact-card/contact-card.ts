import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Contact } from '../../core/models/contact.model';
import { CategoryService } from '../../core/services/category.service';
import { I18nService } from '../../core/services/i18n.service';
import { VCardService } from '../../core/services/vcard.service';
import { FullNamePipe } from '../../core/pipes/full-name.pipe';
import { InitialsPipe } from '../../core/pipes/initials.pipe';
import { HighlightPipe } from '../../core/pipes/highlight.pipe';
import { JobLinePipe } from '../../core/pipes/job-line.pipe';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { CatNamePipe } from '../../core/pipes/category-name.pipe';

@Component({
  selector: 'app-contact-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FullNamePipe,
    InitialsPipe,
    HighlightPipe,
    JobLinePipe,
    TranslatePipe,
    CatNamePipe,
  ],
  templateUrl: './contact-card.html',
})
export class ContactCard {
  private readonly categoryService = inject(CategoryService);
  private readonly vcardService = inject(VCardService);
  private readonly i18n = inject(I18nService);

  readonly contact = input.required<Contact>();
  readonly searchTerm = input<string>('');
  readonly toggleFavorite = output<string>();
  readonly delete = output<string>();

  readonly category = computed(() =>
    this.categoryService.categories().find((entry) => entry.id === this.contact().categoryId),
  );

  readonly starLabel = computed(() =>
    this.i18n.translate(
      this.contact().favorite ? 'contacts.removeFavorite' : 'contacts.addFavorite',
    ),
  );

  /** One-click vCard 4.0 export of this contact. */
  protected exportVCard(): void {
    this.vcardService.exportContact(this.contact(), this.category() ?? null);
  }
}
