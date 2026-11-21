import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BUSINESS_STRUCTURES,
  COMPANY_SIZES,
  SECTORS,
  Company,
  CompanyDraft,
} from '../../../core/models/company.model';
import { Contact } from '../../../core/models/contact.model';
import { CompanyService, RemoveCompanyResult } from '../../../core/services/company.service';
import { ContactService } from '../../../core/services/contact.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FullNamePipe } from '../../../core/pipes/full-name.pipe';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AutofocusDirective } from '../../../core/directives/autofocus.directive';

/**
 * camelCase token of a managed-vocabulary value, used to compose the
 * i18n keys ('size.veryLargeEnterprise', 'sizeHint.veryLargeEnterprise'...).
 * Spaces and hyphens both delimit words.
 */
function vocabularyKeyToken(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      const lower = part.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

/** Companies directory with create/edit modal and guarded deletion. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, FullNamePipe, ConfirmDialog, AutofocusDirective],
  templateUrl: './companies-page.html',
  styleUrl: './companies-page.css',
})
export class CompaniesPage {
  protected readonly companyService = inject(CompanyService);
  private readonly contactService = inject(ContactService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly i18n = inject(I18nService);

  // -- Managed vocabularies exposed as translatable select options ----------

  protected readonly sizeOptions = COMPANY_SIZES.map((value) => ({
    value,
    labelKey: `size.${vocabularyKeyToken(value)}`,
  }));

  protected readonly structureOptions = BUSINESS_STRUCTURES.map((value) => ({
    value,
    labelKey: `structure.${vocabularyKeyToken(value)}`,
  }));

  protected readonly sectorOptions = SECTORS.map((value) => ({
    value,
    labelKey: `sector.${vocabularyKeyToken(value)}`,
  }));

  // -- Page state -----------------------------------------------------------

  /** Banner for blocked or missing deletions, like the categories page. */
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly pendingDeletion = signal<Company | null>(null);

  /** Modal state: the company being edited, or null in create mode. */
  protected readonly editingCompany = signal<Company | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly isEdit = computed(() => this.editingCompany() !== null);

  protected readonly submitAttempted = signal(false);
  /** Inline error inside the modal (duplicate name refused by the service). */
  protected readonly modalError = signal<string | null>(null);

  /** Contacts available as CEO options in the modal select. */
  protected readonly contacts = this.contactService.contacts;

  /** Composes a vocabulary i18n key, e.g. ('size', 'Micro Enterprise') → 'size.microEnterprise'. */
  protected vocabularyKey(prefix: string, value: string): string {
    return `${prefix}.${vocabularyKeyToken(value)}`;
  }

  /** CEO contacts, resolved per company id (null when none recorded). */
  protected readonly ceoByCompany = computed(() => {
    const ceos = new Map<string, Contact | null>();
    for (const company of this.companyService.companies()) {
      ceos.set(company.id, company.contactId === null
        ? null
        : this.contactService.getById(company.contactId));
    }
    return ceos;
  });

  protected readonly form = this.formBuilder.group({
    name: ['', [Validators.required]],
    size: [COMPANY_SIZES[0]],
    businessStructure: [BUSINESS_STRUCTURES[0]],
    sector: [SECTORS[0]],
    contactId: [''],
  });

  // -- Modal lifecycle ------------------------------------------------------

  openCreateModal(): void {
    this.editingCompany.set(null);
    this.formOpen.set(true);
    this.form.reset({
      name: '',
      size: COMPANY_SIZES[0],
      businessStructure: BUSINESS_STRUCTURES[0],
      sector: SECTORS[0],
      contactId: '',
    });
    this.modalError.set(null);
    this.submitAttempted.set(false);
  }

  openEditModal(company: Company): void {
    this.editingCompany.set(company);
    this.formOpen.set(true);
    this.form.reset({
      name: company.name,
      size: company.size,
      businessStructure: company.businessStructure,
      sector: company.sector,
      contactId: company.contactId ?? '',
    });
    this.modalError.set(null);
    this.submitAttempted.set(false);
  }

  closeModal(): void {
    this.editingCompany.set(null);
    this.formOpen.set(false);
  }

  hasError(name: 'name'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched || this.submitAttempted());
  }

  /** Translated first error of the control, or null when it is valid. */
  errorFor(name: 'name'): string | null {
    if (!this.hasError(name)) {
      return null;
    }
    return this.i18n.translate('form.required');
  }

  onSave(): void {
    if (this.form.invalid) {
      this.submitAttempted.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const { name, size, businessStructure, sector, contactId } = this.form.getRawValue();
    const draft: CompanyDraft = {
      name: name.trim(),
      size,
      businessStructure,
      sector,
      contactId: contactId === '' ? null : contactId,
    };
    const editing = this.editingCompany();
    const saved = editing
      ? this.companyService.update(editing.id, draft)
      : this.companyService.create(draft);
    if (!saved) {
      this.modalError.set(this.i18n.translate('companies.duplicate'));
      return;
    }
    this.closeModal();
  }

  // -- Deletion -------------------------------------------------------------

  /** Deletes the pending company, surfacing blocked deletions inline. */
  confirmPendingDeletion(): void {
    const company = this.pendingDeletion();
    if (!company) {
      return;
    }
    const result: RemoveCompanyResult = this.companyService.remove(company.id);
    this.pendingDeletion.set(null);
    if (result === 'inUse') {
      this.errorMessage.set(this.i18n.translate('companies.deleteBlocked'));
    } else if (result === 'notFound') {
      this.errorMessage.set(this.i18n.translate('companies.notFound'));
    } else {
      this.errorMessage.set(null);
    }
  }

  dismissError(): void {
    this.errorMessage.set(null);
  }
}
