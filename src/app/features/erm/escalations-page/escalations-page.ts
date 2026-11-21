import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  ESCALATION_LEVELS,
  ESCALATION_PURPOSES,
  Escalation,
  EscalationDraft,
  EscalationLevel,
  EscalationPurpose,
} from '../../../core/models/phase2/escalation.model';
import { Contact } from '../../../core/models/contact.model';
import { composeFullName } from '../../../core/models/contact-name.model';
import { ContactService } from '../../../core/services/contact.service';
import { CaseService } from '../../../core/services/case.service';
import { EscalationService } from '../../../core/services/escalation.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FullNamePipe } from '../../../core/pipes/full-name.pipe';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AutofocusDirective } from '../../../core/directives/autofocus.directive';

/**
 * Inline message for the source/target difference rule: no matching i18n
 * key exists in i18n.service.ts (which must not be edited) — see the
 * final build summary for the list of missing keys.
 */

/**
 * Group-level validator: the target contact of an escalation must differ
 * from its source contact (one cannot escalate against oneself).
 */
function differentContactsValidator(group: AbstractControl): ValidationErrors | null {
  const source = group.get('sourceContactId');
  const target = group.get('targetContactId');
  const sourceValue = typeof source?.value === 'string' ? source.value : '';
  const targetValue = typeof target?.value === 'string' ? target.value : '';
  if (sourceValue !== '' && targetValue !== '' && sourceValue === targetValue) {
    return { sameContact: true };
  }
  return null;
}

/**
 * ERM Escalations: hierarchical escalation ladder steps between
 * contacts. Each step records a source contact escalating toward a
 * target contact, with source/target ladder levels, a purpose
 * classification, optional notes and an optional linked mediation
 * case. Supports filtering, create/edit via an accessible modal and
 * deletion behind a confirmation dialog.
 */
@Component({
  selector: 'app-escalations-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    FullNamePipe,
    DatePipe,
    ConfirmDialog,
    AutofocusDirective,
  ],
  templateUrl: './escalations-page.html',
  styleUrl: './escalations-page.css',
})
export class EscalationsPage {
  protected readonly escalationService = inject(EscalationService);
  private readonly caseService = inject(CaseService);
  protected readonly contactService = inject(ContactService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly i18n = inject(I18nService);

  // -- Managed vocabularies exposed as translatable select options ----------

  protected readonly levels = ESCALATION_LEVELS;

  protected readonly levelOptions = ESCALATION_LEVELS.map(
    (value: EscalationLevel) => ({
      value,
      labelKey: `escalation.level.${value}`,
    }),
  );

  protected readonly purposeOptions = ESCALATION_PURPOSES.map(
    (value: EscalationPurpose) => ({
      value,
      labelKey: `escalation.purpose.${value}`,
    }),
  );

  // -- Filters ----------------------------------------------------------------

  /** 'all' or one of ESCALATION_PURPOSES. */
  protected readonly purposeFilter = signal<string>('all');

  /** 'all' or one of ESCALATION_LEVELS. */
  protected readonly targetLevelFilter = signal<string>('all');

  protected readonly filteredEscalations = computed(() => {
    const purpose = this.purposeFilter();
    const level = this.targetLevelFilter();
    return this.escalationService.escalations().filter((entry) => {
      if (purpose !== 'all' && entry.purpose !== purpose) {
        return false;
      }
      if (level !== 'all' && entry.targetLevel !== level) {
        return false;
      }
      return true;
    });
  });

  protected onPurposeFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.purposeFilter.set(value);
  }

  protected onTargetLevelFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.targetLevelFilter.set(value);
  }

  // -- Page state ---------------------------------------------------------------

  /** Banner for missing deletions, like the companies page. */
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly pendingDeletion = signal<Escalation | null>(null);

  /** Modal state: the escalation being edited, or null in create mode. */
  protected readonly editingEscalation = signal<Escalation | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly isEdit = computed(() => this.editingEscalation() !== null);

  protected readonly submitAttempted = signal(false);

  /** Contacts available as source/target options in the modal selects. */
  protected readonly contacts = this.contactService.contacts;

  /** Cases available as related-mediation options in the modal select. */
  protected readonly cases = this.caseService.cases;

  /** Case titles by id, resolved once per render for the cards. */
  protected readonly caseTitleById = computed(() => {
    const titles = new Map<string, string>();
    for (const entry of this.caseService.cases()) {
      titles.set(entry.id, entry.title);
    }
    return titles;
  });

  /** Translated title of a linked mediation case, or null when unlinked. */
  protected caseTitle(caseId: string | null): string | null {
    if (caseId === null) {
      return null;
    }
    return this.caseTitleById().get(caseId) ?? null;
  }

  /** Contact for a card reference (null when the record is dangling). */
  protected contactById(contactId: string): Contact | null {
    return this.contactService.getById(contactId);
  }

  // -- Modal form ----------------------------------------------------------------

  protected readonly form = this.formBuilder.group(
    {
      sourceContactId: this.formBuilder.control('', {
        validators: [Validators.required],
      }),
      targetContactId: this.formBuilder.control('', {
        validators: [Validators.required],
      }),
      sourceLevel: this.formBuilder.control<EscalationLevel>(ESCALATION_LEVELS[0]),
      targetLevel: this.formBuilder.control<EscalationLevel>(ESCALATION_LEVELS[0]),
      purpose: this.formBuilder.control<EscalationPurpose>(ESCALATION_PURPOSES[0]),
      mediationCaseId: this.formBuilder.control<string>(''),
      notes: this.formBuilder.control<string>(''),
    },
    {
      validators: [differentContactsValidator],
    },
  );

  // -- Modal lifecycle -----------------------------------------------------------

  openCreateModal(): void {
    this.editingEscalation.set(null);
    this.formOpen.set(true);
    this.form.reset({
      sourceContactId: '',
      targetContactId: '',
      sourceLevel: ESCALATION_LEVELS[0],
      targetLevel: ESCALATION_LEVELS[0],
      purpose: ESCALATION_PURPOSES[0],
      mediationCaseId: '',
      notes: '',
    });
    this.submitAttempted.set(false);
  }

  openEditModal(escalation: Escalation): void {
    this.editingEscalation.set(escalation);
    this.formOpen.set(true);
    this.form.reset({
      sourceContactId: escalation.sourceContactId,
      targetContactId: escalation.targetContactId,
      sourceLevel: escalation.sourceLevel,
      targetLevel: escalation.targetLevel,
      purpose: escalation.purpose,
      mediationCaseId: escalation.mediationCaseId ?? '',
      notes: escalation.notes,
    });
    this.submitAttempted.set(false);
  }

  closeModal(): void {
    this.editingEscalation.set(null);
    this.formOpen.set(false);
  }

  /** True when the control error must be displayed to the user. */
  protected hasError(name: 'sourceContactId' | 'targetContactId'): boolean {
    const control = this.form.controls[name];
    const errored =
      control.invalid || (name === 'targetContactId' && this.form.hasError('sameContact'));
    return errored && (control.dirty || control.touched || this.submitAttempted());
  }

  /** Translated first error of the control, or null when it is valid. */
  protected errorFor(name: 'sourceContactId' | 'targetContactId'): string | null {
    if (!this.hasError(name)) {
      return null;
    }
    if (this.form.controls[name].hasError('required')) {
      return this.i18n.translate('form.required');
    }
    return this.i18n.translate('escalation.sameContact');
  }

  /** Persists the form, creating or updating the escalation step. */
  onSave(): void {
    if (this.form.invalid) {
      this.submitAttempted.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const draft: EscalationDraft = {
      sourceContactId: value.sourceContactId,
      targetContactId: value.targetContactId,
      sourceLevel: value.sourceLevel,
      targetLevel: value.targetLevel,
      purpose: value.purpose,
      mediationCaseId: value.mediationCaseId === '' ? null : value.mediationCaseId,
      notes: value.notes.trim(),
    };
    const editing = this.editingEscalation();
    if (editing === null) {
      this.escalationService.create(draft);
    } else {
      this.escalationService.update(editing.id, draft);
    }
    this.closeModal();
  }

  // -- Deletion ------------------------------------------

  /** Deletes the pending escalation, surfacing failures inline. */
  confirmPendingDeletion(): void {
    const escalation = this.pendingDeletion();
    if (escalation === null) {
      return;
    }
    const removed = this.escalationService.remove(escalation.id);
    this.pendingDeletion.set(null);
    if (!removed) {
      this.errorMessage.set(this.i18n.translate('companies.notFound'));
    } else {
      this.errorMessage.set(null);
    }
  }

  dismissError(): void {
    this.errorMessage.set(null);
  }

  /** aria-label for the visual ladder arrow between the two names. */
  protected arrowAriaLabel(escalation: Escalation): string {
    const source = this.contactById(escalation.sourceContactId);
    const target = this.contactById(escalation.targetContactId);
    const sourceName =
      source === null ? '—' : `${composeFullName(source.name).trim() || '—'}`;
    const targetName =
      target === null ? '—' : `${composeFullName(target.name).trim() || '—'}`;
    return `${sourceName} -> ${targetName}`;
  }
}
