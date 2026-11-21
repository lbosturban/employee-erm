import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ContactService } from '../../core/services/contact.service';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { DebounceInputDirective } from '../../core/directives/debounce-input.directive';
import { ContactCard } from '../../shared/contact-card/contact-card';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { Contact } from '../../core/models/contact.model';
import { composeFullName } from '../../core/models/contact-name.model';

/** Favorites view: adds a small search on top of the favorite contact set. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, DebounceInputDirective, ContactCard, ConfirmDialog],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class FavoritesPage {
  protected readonly contactService = inject(ContactService);

  protected readonly search = signal('');
  protected readonly pendingDeletion = signal<Contact | null>(null);

  protected readonly favorites = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.contactService
      .contacts()
      .filter((contact) => contact.favorite)
      .filter((contact) =>
        term ? this.contactService.matchesSearch(contact, term) : true,
      )
      .sort((a, b) =>
        composeFullName(a.name)
          .toLowerCase()
          .localeCompare(composeFullName(b.name).toLowerCase()),
      );
  });

  confirmPendingDeletion(): void {
    const contact = this.pendingDeletion();
    if (contact) {
      void this.contactService.remove(contact.id);
      this.pendingDeletion.set(null);
    }
  }
}
