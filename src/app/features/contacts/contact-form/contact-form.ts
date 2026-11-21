import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ContactService, ContactDraft } from '../../../core/services/contact.service';
import { Contact } from '../../../core/models/contact.model';
import { CategoryService } from '../../../core/services/category.service';
import { I18nService } from '../../../core/services/i18n.service';
import { strictEmailValidator, phoneValidator } from '../../../core/validators/custom-validators';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CatNamePipe } from '../../../core/pipes/category-name.pipe';
import { Deactivatable } from '../../../core/guards/can-deactivate.guard';
import { AutofocusDirective } from '../../../core/directives/autofocus.directive';

/**
 * Shared create/edit page for contacts (/contacts/new and /contacts/:id/edit).
 * Edit mode is detected through the contact preloaded by contactResolver.
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
  protected readonly i18n = inject(I18nService);

  /** Preloaded by the contactResolver on the /contacts/:id/edit route. */
  private readonly editing: Contact | undefined = this.route.snapshot.data['contact'];

  protected readonly isEdit = this.editing !== undefined;

  /** True right after a successful save so navigation is not blocked. */
  private readonly saved = signal(false);

  protected readonly submitAttempted = signal(false);

  /** Notifies the user once the form has been persisted. */
  protected readonly savedMessage = computed(() =>
    this.saved() ? this.i18n.translate('form.saved') : null,
  );

  protected readonly form = this.formBuilder.group({
    firstName: [this.editing?.firstName ?? '', [Validators.required, Validators.maxLength(50)]],
    lastName: [this.editing?.lastName ?? '', [Validators.required, Validators.maxLength(50)]],
    email: [
      this.editing?.email ?? '',
      [Validators.required, strictEmailValidator() as ValidatorFn, Validators.maxLength(120)],
    ],
    phone: [this.editing?.phone ?? '', [Validators.required, phoneValidator() as ValidatorFn]],
    company: [this.editing?.company ?? '', Validators.maxLength(80)],
    jobTitle: [this.editing?.jobTitle ?? '', Validators.maxLength(80)],
    categoryId: [this.editing?.categoryId ?? ''],
    favorite: [this.editing?.favorite ?? false],
    notes: [this.editing?.notes ?? '', Validators.maxLength(500)],
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
  errorFor(controlName: 'firstName' | 'lastName' | 'email' | 'phone'): string | null {
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

  hasError(controlName: 'firstName' | 'lastName' | 'email' | 'phone'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched || this.submitAttempted());
  }

  /** Persists the form, then navigates back to the contact detail. */
  onSubmit(): void {
    if (this.form.invalid) {
      this.submitAttempted.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const draft: ContactDraft = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      email: raw.email.trim(),
      phone: raw.phone.trim(),
      company: raw.company.trim(),
      jobTitle: raw.jobTitle.trim(),
      categoryId: raw.categoryId === '' ? null : raw.categoryId,
      favorite: raw.favorite,
      notes: raw.notes.trim(),
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
