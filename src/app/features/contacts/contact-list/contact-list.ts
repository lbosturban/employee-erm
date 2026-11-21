import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContactService } from '../../../core/services/contact.service';
import { CategoryService } from '../../../core/services/category.service';
import { CompanyService } from '../../../core/services/company.service';
import { DataTransferService } from '../../../core/services/data-transfer.service';
import { I18nService } from '../../../core/services/i18n.service';
import {
  Contact,
  ContactFilters,
  ContactSort,
  HrProcessStatus,
  HR_PROCESS_STATUSES,
} from '../../../core/models/contact.model';
import { composeFullName } from '../../../core/models/contact-name.model';
import { DataSnapshot } from '../../../core/models/snapshot.model';
import { SCHEMA_VERSION } from '../../../core/services/migration.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CatNamePipe } from '../../../core/pipes/category-name.pipe';
import { AutofocusDirective } from '../../../core/directives/autofocus.directive';
import { DebounceInputDirective } from '../../../core/directives/debounce-input.directive';
import { ContactCard } from '../../../shared/contact-card/contact-card';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { Pager } from '../../../shared/pager/pager';

const PAGE_SIZE = 9;
const SORT_OPTIONS: ContactSort[] = ['nameAsc', 'nameDesc', 'dateDesc', 'dateAsc'];

/** Value of the HR-status select: a concrete status or '' (= no filter). */
type HrStatusFilter = HrProcessStatus | '';

/** Value of the company-activity select: active/inactive or '' (= no filter). */
type CompanyActiveFilter = 'active' | 'inactive' | '';

/** Full contact directory: search, filter, sort, paginate and import/export. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    CatNamePipe,
    AutofocusDirective,
    DebounceInputDirective,
    ContactCard,
    ConfirmDialog,
    Pager,
  ],
  templateUrl: './contact-list.html',
  styleUrl: './contact-list.css',
})
export class ContactListPage {
  protected readonly contactService = inject(ContactService);
  protected readonly categoryService = inject(CategoryService);
  protected readonly companyService = inject(CompanyService);
  protected readonly i18n = inject(I18nService);
  private readonly dataTransfer = inject(DataTransferService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly page = signal(1);
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly hrStatuses = HR_PROCESS_STATUSES;

  // Filter state, kept in signals so every derived list recomputes automatically.
  protected readonly search = signal('');
  protected readonly categoryFilter = signal<string>('');
  protected readonly hrStatusFilter = signal<HrStatusFilter>('');
  protected readonly companyActiveFilter = signal<CompanyActiveFilter>('');
  protected readonly favoritesOnly = signal(false);
  protected readonly sort = signal<ContactSort>('nameAsc');

  protected readonly importMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  /** Contact pending deletion, drives the confirmation dialog. */
  protected readonly pendingDeletion = signal<Contact | null>(null);

  protected readonly filtered = computed<Contact[]>(() => {
    const term = this.search();
    const categoryId = this.categoryFilter();
    const hrStatus = this.hrStatusFilter();
    const companyActive = this.companyActiveFilter();
    const favoritesOnly = this.favoritesOnly();
    const sort = this.sort();

    const matching = this.contactService.contacts().filter((contact) => {
      // Name-token aware search shared with the header quick search.
      if (term && !this.contactService.matchesSearch(contact, term)) {
        return false;
      }
      if (categoryId && contact.categoryId !== categoryId) {
        return false;
      }
      if (hrStatus && contact.hrProcessStatus !== hrStatus) {
        return false;
      }
      if (companyActive && contact.isCompanyActive !== (companyActive === 'active')) {
        return false;
      }
      if (favoritesOnly && !contact.favorite) {
        return false;
      }
      return true;
    });

    return sortContacts(matching, sort);
  });

  protected readonly pageSlice = computed<Contact[]>(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  onPageChange(page: number): void {
    this.page.set(page);
  }

  onCategoryChange(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value);
  }

  onHrStatusChange(event: Event): void {
    this.hrStatusFilter.set((event.target as HTMLSelectElement).value as HrStatusFilter);
  }

  onCompanyActiveChange(event: Event): void {
    this.companyActiveFilter.set(
      (event.target as HTMLSelectElement).value as CompanyActiveFilter,
    );
  }

  onSortChange(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as ContactSort);
  }

  /** Prevents the pager from pointing past the end after a filter change. */
  resetPage(): void {
    this.page.set(1);
  }

  confirmPendingDeletion(): void {
    const contact = this.pendingDeletion();
    if (contact) {
      void this.contactService.remove(contact.id);
      this.pendingDeletion.set(null);
    }
  }

  /** Exports the full snapshot: contacts + categories + companies. */
  exportJson(): void {
    const snapshot: DataSnapshot = {
      schemaVersion: SCHEMA_VERSION,
      categories: this.categoryService.categories(),
      companies: this.companyService.companies(),
      contacts: this.contactService.contacts(),
    };
    this.dataTransfer.export(snapshot);
    this.importMessage.set(this.i18n.translate('contacts.exported'));
  }

  /** Replaces the whole local state from a validated snapshot file. */
  async importJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.errorMessage.set(null);
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
      this.resetPage();
      this.importMessage.set(this.i18n.translate('contacts.imported'));
    } catch {
      this.errorMessage.set(this.i18n.translate('contacts.importInvalid'));
    }
  }
}

function sortContacts(contacts: Contact[], sort: ContactFilters['sort']): Contact[] {
  const sorted = [...contacts];
  switch (sort) {
    case 'nameAsc':
      sorted.sort(byName);
      break;
    case 'nameDesc':
      sorted.sort((a, b) => byName(b, a));
      break;
    case 'dateDesc':
      sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
      break;
    case 'dateAsc':
      sorted.sort((a, b) => a.addedAt.localeCompare(b.addedAt));
      break;
  }
  return sorted;
}

function byName(a: Contact, b: Contact): number {
  return composeFullName(a.name).toLowerCase().localeCompare(composeFullName(b.name).toLowerCase());
}
