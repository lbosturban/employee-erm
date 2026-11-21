import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryService, RemoveCategoryResult } from '../../../core/services/category.service';
import { I18nService } from '../../../core/services/i18n.service';
import { Category } from '../../../core/models/category.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CatNamePipe } from '../../../core/pipes/category-name.pipe';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';

/** Category directory with create, edit, delete (guarded) actions. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, CatNamePipe, ConfirmDialog],
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
})
export class CategoryListPage {
  protected readonly categoryService = inject(CategoryService);
  private readonly i18n = inject(I18nService);

  /** Error banner (blocked deletion, duplicate name, persistence failure). */
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly pendingDeletion = signal<Category | null>(null);

  /**
   * Deletes a category. The service refuses when contacts still reference
   * it; the explicit error message tells the user what to do first.
   */
  confirmPendingDeletion(): void {
    const category = this.pendingDeletion();
    if (!category) {
      return;
    }
    const result: RemoveCategoryResult = this.categoryService.remove(category.id);
    this.pendingDeletion.set(null);
    if (result === 'inUse') {
      this.errorMessage.set(this.i18n.translate('categories.inUse'));
    } else if (result === 'notFound') {
      this.errorMessage.set(this.i18n.translate('categories.notFound'));
    } else {
      this.errorMessage.set(null);
    }
  }

  dismissError(): void {
    this.errorMessage.set(null);
  }
}
