import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  CASE_KINDS,
  CASE_STATUSES,
  CaseKind,
  CaseStatus,
  CrmCase,
  CrmCaseDraft,
} from '../../../core/models/phase2/case.model';
import { Company } from '../../../core/models/company.model';
import { Contact } from '../../../core/models/contact.model';
import { CaseService } from '../../../core/services/case.service';
import { CompanyService } from '../../../core/services/company.service';
import { ContactService } from '../../../core/services/contact.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FullNamePipe } from '../../../core/pipes/full-name.pipe';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AutofocusDirective } from '../../../core/directives/autofocus.directive';

/** Accepted values of the kind filter (a kind, or 'all'). */
type KindFilter = CaseKind | 'all';

/** Accepted values of the lifecycle-status filter (a status, or 'all'). */
type StatusFilter = CaseStatus | 'all';

/** Translatable select option for the managed case vocabularies. */
interface SelectOption<T extends string> {
  readonly value: T;
  readonly labelKey: string;
}

/** A case card view model: contact ids resolved against ContactService. */
interface EnrichedCase extends CrmCase {
  /** Contact per contactIds entry; null when the id is dangling. */
  readonly resolvedContacts: readonly (Contact | null)[];
  /** Company when companyId is set and resolvable, else null. */
  readonly company: Company | null;
}

/** Type guard narrowing a raw select value to a {@link KindFilter}. */
function isKindFilter(value: string): value is KindFilter {
  return value === 'all' || (CASE_KINDS as readonly string[]).includes(value);
}

/** Type guard narrowing a raw select value to a {@link StatusFilter}. */
function isStatusFilter(value: string): value is StatusFilter {
  return value === 'all' || (CASE_STATUSES as readonly string[]).includes(value);
}

/** FormArray validator: at least one concerned contact must be checked. */
function atLeastOneChecked(control: AbstractControl): ValidationErrors | null {
  const controls = (control as FormArray<AbstractControl<boolean>>).controls;
  return controls.some((entry) => entry.value) ? null : { atLeastOne: true };
}

/**
 * ERM Cases directory: workplace irritants, conflicts, complaints and
 * mediations. Filterable by kind and lifecycle status, with a create /
 * edit modal and confirm-guarded deletion.
 */
@Component({
  selector: 'app-cases-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, TranslatePipe, FullNamePipe, ConfirmDialog, AutofocusDirective],
  templateUrl: './cases-page.html',
  styleUrl: './cases-page.css',
})
export class CasesPage {
  protected readonly caseService = inject(CaseService);
  private readonly contactService = inject(ContactService);
  private readonly companyService = inject(CompanyService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly i18n = inject(I18nService);

  // -- Managed vocabularies as translatable select options ------------------

  protected readonly kindOptions: readonly SelectOption<CaseKind>[] = CASE_KINDS.map((value) => ({
    value,
    labelKey: `case.kind.${value}`,
  }));

  protected readonly statusOptions: readonly SelectOption<CaseStatus>[] = CASE_STATUSES.map(
    (value) => ({ value, labelKey: `case.status.${value}` }),
  );

  // -- Filters ---------------------------------------------------------------

  protected readonly kindFilter = signal<KindFilter>('all');
  protected readonly statusFilter = signal<StatusFilter>('all');

  /** Cases passing both filters, with contacts and company resolved. */
  protected readonly visibleCases = computed<readonly EnrichedCase[]>(() => {
    const kind = this.kindFilter();
    const status = this.statusFilter();
    return this.caseService
      .cases()
      .filter((entry) => (kind === 'all' || entry.kind === kind) && (status === 'all' || entry.status === status))
      .map((entry) => ({
        ...entry,
        resolvedContacts: entry.contactIds.map((id) => this.contactService.getById(id)),
        company: entry.companyId === null ? null : this.companyService.getById(entry.companyId),
      }));
  });

  protected onKindFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.kindFilter.set(isKindFilter(value) ? value : 'all');
  }

  protected onStatusFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.statusFilter.set(isStatusFilter(value) ? value : 'all');
  }

  // -- Modal state -----------------------------------------------------------

  /** The case being edited, or null in create mode. */
  protected readonly editingCase = signal<CrmCase | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly isEdit = computed(() => this.editingCase() !== null);

  protected readonly submitAttempted = signal(false);
  protected readonly pendingDeletion = signal<CrmCase | null>(null);

  /** Contacts available as "concerned by" checkbox options. */
  protected readonly contacts = this.contactService.contacts;

  protected readonly form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    kind: [CASE_KINDS[0]],
    status: [CASE_STATUSES[0]],
    description: [''],
    companyId: [''],
    contactIds: this.formBuilder.array(
      this.contactService.contacts().map(() => this.formBuilder.control(false)),
      atLeastOneChecked,
    ),
  });

  // -- Modal lifecycle -------------------------------------------------------

  openCreateModal(): void {
    this.editingCase.set(null);
    this.formOpen.set(true);
    this.form.reset({
      title: '',
      kind: CASE_KINDS[0],
      status: CASE_STATUSES[0],
      description: '',
      companyId: '',
    });
    this.resetContactCheckboxes([]);
    this.submitAttempted.set(false);
  }

  openEditModal(caseItem: CrmCase): void {
    this.editingCase.set(caseItem);
    this.formOpen.set(true);
    this.form.reset({
      title: caseItem.title,
      kind: caseItem.kind,
      status: caseItem.status,
      description: caseItem.description,
      companyId: caseItem.companyId ?? '',
    });
    this.resetContactCheckboxes(caseItem.contactIds);
    this.submitAttempted.set(false);
  }

  closeModal(): void {
    this.editingCase.set(null);
    this.formOpen.set(false);
  }

  private resetContactCheckboxes(selectedIds: readonly string[]): void {
    const selected = new Set(selectedIds);
    this.form.controls.contactIds.controls.forEach((control, index) => {
      const contact = this.contacts()[index];
      control.setValue(contact !== undefined && selected.has(contact.id));
    });
  }

  // -- Validation helpers ------------------------------------------------------

  protected hasError(name: 'title'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched || this.submitAttempted());
  }

  /** Translated first error of the title control, or null when valid. */
  protected errorForTitle(): string | null {
    if (!this.hasError('title')) {
      return null;
    }
    return this.i18n.translate('form.required');
  }

  /** True once the missing-contact error should surface (after a submit). */
  protected contactsInvalid(): boolean {
    return this.submitAttempted() && this.form.controls.contactIds.invalid;
  }

  // -- Save --------------------------------------------------------------------

  /** Contact ids picked in the checkbox group, in contacts() order. */
  private selectedContactIds(): string[] {
    return this.contacts()
      .filter((_contact, index) => this.form.controls.contactIds.controls[index]?.value)
      .map((contact) => contact.id);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.submitAttempted.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const contactIds = this.selectedContactIds();
    if (contactIds.length === 0) {
      // Defensive double check on the at-least-one-contact rule.
      this.submitAttempted.set(true);
      return;
    }
    const { title, kind, status, description, companyId } = this.form.getRawValue();
    const draft: CrmCaseDraft = {
      title: title.trim(),
      kind,
      status,
      description: description.trim(),
      contactIds,
      companyId: companyId === '' ? null : companyId,
    };
    const editing = this.editingCase();
    if (editing) {
      this.caseService.update(editing.id, draft);
    } else {
      this.caseService.create(draft);
    }
    this.closeModal();
  }

  // -- Deletion ----------------------------------------------------------------

  /** Removes the pending case; cases never block their own deletion. */
  confirmPendingDeletion(): void {
    const caseItem = this.pendingDeletion();
    if (!caseItem) {
      return;
    }
    this.caseService.remove(caseItem.id);
    this.pendingDeletion.set(null);
  }
}
