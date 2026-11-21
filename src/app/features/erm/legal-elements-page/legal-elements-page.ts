import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LEGAL_SECTION_KINDS,
  LegalElementReference,
  LegalElementsBundle,
  LegalSectionKind,
} from '../../../core/models/phase2/legal-elements.model';
import { LegalElementsService } from '../../../core/services/legal-elements.service';
import { ContactService } from '../../../core/services/contact.service';
import { CompanyService } from '../../../core/services/company.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FullNamePipe } from '../../../core/pipes/full-name.pipe';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AutofocusDirective } from '../../../core/directives/autofocus.directive';

/**
 * Phase-2 "Legal Elements" page. Each bundle attaches structured
 * references — grouped into four fixed sections — to one contact. The
 * module intentionally stops at label + location + optional URL: links to
 * external legal databases will be wired later.
 */
@Component({
  selector: 'app-legal-elements-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    FullNamePipe,
    DatePipe,
    ConfirmDialog,
    AutofocusDirective,
  ],
  templateUrl: './legal-elements-page.html',
  styleUrl: './legal-elements-page.css',
})
export class LegalElementsPage {
  protected readonly legalService = inject(LegalElementsService);
  private readonly contactService = inject(ContactService);
  private readonly companyService = inject(CompanyService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly i18n = inject(I18nService);

  // -- Fixed section taxonomy, rendered in model declaration order ----------

  protected readonly sectionKinds = LEGAL_SECTION_KINDS;

  // -- Selects sources -------------------------------------------------------

  protected readonly contacts = this.contactService.contacts;
  protected readonly companies = this.companyService.companies;

  // -- Bundle creation modal -------------------------------------------------

  protected readonly formOpen = signal(false);
  protected readonly submitAttempted = signal(false);

  protected readonly form = this.formBuilder.group({
    contactId: ['', [Validators.required]],
    companyId: [''],
  });

  // -- Inline add-reference form (one visible at a time) ---------------------

  protected readonly referenceFormBundleId = signal<string | null>(null);
  protected readonly referenceSubmitAttempted = signal(false);

  protected readonly referenceForm = this.formBuilder.group({
    kind: [LEGAL_SECTION_KINDS[0]],
    label: ['', [Validators.required]],
    location: ['', [Validators.required]],
    externalUrl: [''],
  });

  // -- Bundle deletion -------------------------------------------------------

  protected readonly pendingDeletion = signal<LegalElementsBundle | null>(null);

  // -- Bundle modal lifecycle ------------------------------------------------

  openCreateModal(): void {
    this.form.reset({ contactId: '', companyId: '' });
    this.formOpen.set(true);
    this.submitAttempted.set(false);
  }

  closeModal(): void {
    this.formOpen.set(false);
  }

  hasError(name: 'contactId'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched || this.submitAttempted());
  }

  onSave(): void {
    if (this.form.invalid) {
      this.submitAttempted.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const { contactId, companyId } = this.form.getRawValue();
    this.legalService.create({
      contactId,
      companyId: companyId === '' ? null : companyId,
      references: [],
    });
    this.closeModal();
  }

  // -- Card helpers ----------------------------------------------------------

  contactOf(bundle: LegalElementsBundle) {
    return this.contactService.getById(bundle.contactId);
  }

  companyNameOf(bundle: LegalElementsBundle): string | null {
    return bundle.companyId === null ? null : (this.companyService.getById(bundle.companyId)?.name ?? null);
  }

  /** References of a bundle for one section, in bundle order. */
  referencesOf(
    bundle: LegalElementsBundle,
    kind: LegalSectionKind,
  ): LegalElementReference[] {
    return this.legalService.referencesBySection(bundle).get(kind) ?? [];
  }

  // -- Inline reference form -------------------------------------------------

  toggleReferenceForm(bundleId: string): void {
    const isOpen = this.referenceFormBundleId() === bundleId;
    this.referenceFormBundleId.set(isOpen ? null : bundleId);
    this.referenceForm.reset({ kind: LEGAL_SECTION_KINDS[0], label: '', location: '', externalUrl: '' });
    this.referenceSubmitAttempted.set(false);
  }

  closeReferenceForm(): void {
    this.referenceFormBundleId.set(null);
  }

  hasReferenceError(name: 'label' | 'location'): boolean {
    const control = this.referenceForm.controls[name];
    return control.invalid && (control.dirty || control.touched || this.referenceSubmitAttempted());
  }

  onAddReference(bundle: LegalElementsBundle): void {
    if (this.referenceForm.invalid) {
      this.referenceSubmitAttempted.set(true);
      this.referenceForm.markAllAsTouched();
      return;
    }
    const { kind, label, location, externalUrl } = this.referenceForm.getRawValue();
    this.legalService.addReference(bundle.id, {
      kind,
      label: label.trim(),
      location: location.trim(),
      externalUrl: externalUrl.trim() === '' ? null : externalUrl.trim(),
    });
    this.closeReferenceForm();
  }

  onRemoveReference(bundle: LegalElementsBundle, referenceId: string): void {
    this.legalService.removeReference(bundle.id, referenceId);
  }

  // -- Bundle deletion -------------------------------------------------------

  confirmPendingDeletion(): void {
    const bundle = this.pendingDeletion();
    if (!bundle) {
      return;
    }
    this.legalService.remove(bundle.id);
    this.pendingDeletion.set(null);
  }
}
