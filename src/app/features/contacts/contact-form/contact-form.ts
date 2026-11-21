import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ContactService } from '../../../core/services/contact.service';
import { Contact, ContactDraft, HrProcessStatus, HR_PROCESS_STATUSES } from '../../../core/models/contact.model';
import {
  ContactName,
  CulturalOrder,
  CULTURAL_ORDERS,
  NameMode,
} from '../../../core/models/contact-name.model';
import { CategoryService } from '../../../core/services/category.service';
import { CompanyService } from '../../../core/services/company.service';
import { I18nService } from '../../../core/services/i18n.service';
import {
  strictEmailValidator,
  phoneValidator,
  contactNameValidator,
} from '../../../core/validators/custom-validators';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CatNamePipe } from '../../../core/pipes/category-name.pipe';
import { Deactivatable } from '../../../core/guards/can-deactivate.guard';
import { AutofocusDirective } from '../../../core/directives/autofocus.directive';

/**
 * Shared create/edit page for contacts (/contacts/new and /contacts/:id/edit).
 * Edit mode is detected through the contact preloaded by contactResolver.
 * The name is captured through a hybrid group: direct 'full' entry or
 * structured cultural tokens (see contact-name.model.ts).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, CatNamePipe, AutofocusDirective],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.css',
})
export class ContactFormPage implements Deactivatable {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contactService = inject(ContactService);
  protected readonly categoryService = inject(CategoryService);
  protected readonly companyService = inject(CompanyService);
  protected readonly i18n = inject(I18nService);

  /** Managed vocabularies for the selects. */
  protected readonly hrStatuses = HR_PROCESS_STATUSES;
  protected readonly culturalOrders = CULTURAL_ORDERS;

  /** Preloaded by the contactResolver on the /contacts/:id/edit route. */
  private readonly editing: Contact | undefined = this.route.snapshot.data['contact'];

  protected readonly isEdit = this.editing !== undefined;

  /** True right after a successful save so navigation is not blocked. */
  private readonly saved = signal(false);

  protected readonly submitAttempted = signal(false);

  /**
   * Mirrors the name.mode control value so the template can show either
   * the raw full-name field or the structured token fields reactively.
   */
  protected readonly nameMode = signal<NameMode>(this.editing?.name.mode ?? 'full');

  /** Notifies the user once the form has been persisted. */
  protected readonly savedMessage = computed(() =>
    this.saved() ? this.i18n.translate('form.saved') : null,
  );

  protected readonly form = this.formBuilder.group({
    name: this.formBuilder.group(
      {
        mode: this.formBuilder.control<NameMode>(this.editing?.name.mode ?? 'full'),
        rawFullName: [
          this.editing?.name.rawFullName ?? '',
          [Validators.maxLength(120)],
        ],
        shortTitle: [this.editing?.name.shortTitle ?? '', [Validators.maxLength(20)]],
        longTitle: [this.editing?.name.longTitle ?? '', [Validators.maxLength(40)]],
        firstName: [this.editing?.name.firstName ?? '', [Validators.maxLength(50)]],
        // Entered as a comma-separated list, normalized to tokens on submit.
        middleNames: [
          (this.editing?.name.middleNames ?? []).join(', '),
          [Validators.maxLength(200)],
        ],
        lastName: [this.editing?.name.lastName ?? '', [Validators.maxLength(50)]],
        culturalOrder: this.formBuilder.control<CulturalOrder>(
          this.editing?.name.culturalOrder ?? 'western',
        ),
      },
      { validators: contactNameValidator() },
    ),
    city: [this.editing?.city ?? '', [Validators.maxLength(80)]],
    email: [
      this.editing?.email ?? '',
      [Validators.required, strictEmailValidator() as ValidatorFn, Validators.maxLength(120)],
    ],
    phone: [this.editing?.phone ?? '', [Validators.required, phoneValidator() as ValidatorFn]],
    companyId: [this.editing?.companyId ?? '', [Validators.maxLength(64)]],
    isCompanyActive: [this.editing?.isCompanyActive ?? true],
    hrProcessStatus: this.formBuilder.control<HrProcessStatus>(
      this.editing?.hrProcessStatus ?? 'Pending',
    ),
    jobTitle: [this.editing?.jobTitle ?? '', [Validators.maxLength(80)]],
    categoryId: [this.editing?.categoryId ?? ''],
    favorite: [this.editing?.favorite ?? false],
    notes: [this.editing?.notes ?? '', [Validators.maxLength(500)]],
    profileImageUrl: [this.editing?.profileImageUrl ?? '', [Validators.maxLength(400)]],
    profileImageAlt: [this.editing?.profileImageAlt ?? '', [Validators.maxLength(120)]],
  });

  /**
   * Blocks leaving the page while there are unsaved modifications
   * (consumed by canDeactivateGuard). Validation status is ignored on
   * purpose: invalid-but-saved state may still be worth keeping in draft.
   */
  canDeactivate(): boolean {
    return !this.form.dirty || this.saved();
  }

  /** Translates the relevant validation error for a control. */
  errorFor(controlName: 'email' | 'phone'): string | null {
    const control = this.form.controls[controlName];
    if (!control.errors) {
      return null;
    }
    const { errors } = control;
    if (errors['required']) {
      return this.i18n.translate('form.required');
    }
    if (errors['email']) {
      return this.i18n.translate('form.invalidEmail');
    }
    if (errors['phone']) {
      return this.i18n.translate('form.invalidPhone');
    }
    return this.i18n.translate('form.required');
  }

  hasError(controlName: 'email' | 'phone'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched || this.submitAttempted());
  }

  /** Name-group error (missing raw full name or missing tokens). */
  nameHasError(): boolean {
    const group = this.form.controls.name;
    return group.invalid && (group.dirty || group.touched || this.submitAttempted());
  }

  /** Keeps the reactive mirror of the name mode in sync with the control. */
  onNameModeChange(event: Event): void {
    this.nameMode.set((event.target as HTMLSelectElement).value as NameMode);
  }

  /** Splits the comma-separated middle-names input into clean tokens. */
  private parseMiddleNames(value: string): string[] {
    return value
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token !== '');
  }

  /** Persists the form, then navigates back to the contact detail. */
  onSubmit(): void {
    if (this.form.invalid) {
      this.submitAttempted.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    // Trim every name token; only meaningful fields are persisted.
    const name: ContactName = {
      mode: raw.name.mode,
      rawFullName: raw.name.rawFullName.trim(),
      shortTitle: raw.name.shortTitle.trim(),
      longTitle: raw.name.longTitle.trim(),
      firstName: raw.name.firstName.trim(),
      middleNames: this.parseMiddleNames(raw.name.middleNames),
      lastName: raw.name.lastName.trim(),
      culturalOrder: raw.name.culturalOrder,
    };
    const draft: ContactDraft = {
      name,
      jobTitle: raw.jobTitle.trim(),
      email: raw.email.trim(),
      phone: raw.phone.trim(),
      city: raw.city.trim(),
      companyId: raw.companyId === '' ? null : raw.companyId,
      isCompanyActive: raw.isCompanyActive,
      hrProcessStatus: raw.hrProcessStatus,
      categoryId: raw.categoryId === '' ? null : raw.categoryId,
      favorite: raw.favorite,
      notes: raw.notes.trim(),
      profileImageUrl: raw.profileImageUrl.trim(),
      profileImageAlt: raw.profileImageAlt.trim(),
    };
    const contact =
      this.isEdit && this.editing
        ? this.contactService.update(this.editing.id, draft)
        : this.contactService.create(draft);
    if (!contact) {
      // Persistence failed (quota, private mode...): stay on the page.
      return;
    }
    this.saved.set(true);
    void this.router.navigateByUrl(`/contacts/${contact.id}`);
  }

  /** Cancels editing: the canDeactivate guard handles unsaved changes. */
  onCancel(): void {
    void this.router.navigateByUrl(
      this.isEdit && this.editing ? `/contacts/${this.editing.id}` : '/contacts',
    );
  }
}
