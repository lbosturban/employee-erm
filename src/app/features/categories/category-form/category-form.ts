import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../../core/services/category.service';
import { I18nService } from '../../../core/services/i18n.service';
import { Deactivatable } from '../../../core/guards/can-deactivate.guard';
import { AsyncValidatorFn } from '@angular/forms';
import { hexColorValidator } from '../../../core/validators/custom-validators';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AutofocusDirective } from '../../../core/directives/autofocus.directive';
import { Category } from '../../../core/models/category.model';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
/** Shared create/edit page for categories, with bilingual names (EN/FR) and async duplicate check. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, AutofocusDirective],
  templateUrl: './category-form.html',
  styleUrl: './category-form.css',
})
export class CategoryFormPage implements Deactivatable {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categoryService = inject(CategoryService);
  private readonly i18n = inject(I18nService);

  /** Preloaded by categoryResolver on the /categories/:id/edit route. */
  private readonly editing = this.route.snapshot.data['category'] as Category | undefined;

  protected readonly isEdit = this.editing !== undefined;
  private readonly saved = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    /** Both language versions are required, with their own duplicate check. */
    nameEn: [
      this.editing?.name.en ?? '',
      [Validators.required, Validators.maxLength(40)],
      [this.uniqueNameValidator('en')],
    ],
    nameFr: [
      this.editing?.name.fr ?? '',
      [Validators.required, Validators.maxLength(40)],
      [this.uniqueNameValidator('fr')],
    ],
    color: [this.editing?.color ?? '#2563eb', [Validators.required, hexColorValidator()]],
  });

  /** Async validator rejecting a name already used by another category. */
  private uniqueNameValidator(language: 'en' | 'fr'): AsyncValidatorFn {
    return (control) => {
      const name =
        language === 'en'
          ? { en: String(control.value ?? ''), fr: this.form?.controls.nameFr.value ?? '' }
          : { en: this.form?.controls.nameEn.value ?? '', fr: String(control.value ?? '') };
      if (!name.en.trim() || !name.fr.trim()) {
        return of(null);
      }
      return of(null).pipe(
        map(() =>
          this.categoryService.exists(name, this.editing?.id) ? { duplicate: true } : null,
        ),
      );
    };
  }

  canDeactivate(): boolean {
    return !this.form.dirty || this.saved();
  }

  hasError(name: 'nameEn' | 'nameFr' | 'color'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched || this.submitAttempted());
  }

  errorFor(name: 'nameEn' | 'nameFr' | 'color'): string | null {
    const { errors } = this.form.controls[name];
    if (!errors) {
      return null;
    }
    if (errors['duplicate']) {
      return this.i18n.translate('categories.duplicate');
    }
    return this.i18n.translate('form.required');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.submitAttempted.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const { nameEn, nameFr, color } = this.form.getRawValue();
    const draft = {
      name: { en: nameEn.trim(), fr: nameFr.trim() },
      color,
    };
    const category =
      this.isEdit && this.editing
        ? this.categoryService.update(this.editing.id, draft)
        : this.categoryService.create(draft);
    if (!category) {
      this.errorMessage.set(this.i18n.translate('categories.duplicate'));
      return;
    }
    this.saved.set(true);
    void this.router.navigateByUrl('/categories');
  }

  onCancel(): void {
    void this.router.navigateByUrl('/categories');
  }
}
