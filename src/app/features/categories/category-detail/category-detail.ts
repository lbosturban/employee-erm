import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../../core/models/category.model';
import { ContactService } from '../../../core/services/contact.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CatNamePipe } from '../../../core/pipes/category-name.pipe';
import { ContactCard } from '../../../shared/contact-card/contact-card';

/** Lists every contact belonging to one category (resolved by categoryResolver). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, CatNamePipe, ContactCard],
  templateUrl: './category-detail.html',
  styleUrl: './category-detail.css',
})
export class CategoryDetailPage {
  protected readonly contactService = inject(ContactService);

  /** Resolved by categoryResolver and bound via withComponentInputBinding. */
  readonly category = input.required<Category>();

  protected readonly contacts = computed(() =>
    this.contactService.getByCategory(this.category().id),
  );
}
