import { Pipe, PipeTransform, inject } from '@angular/core';
import { BilingualText } from '../models/category.model';
import { I18nService } from '../services/i18n.service';

/** Minimal shape needed to display a localized category name. */
type BilingualEntity = { name: BilingualText };

/**
 * Displays a category name in the active language, falling back to the
 * other language (then to an empty string) when a translation is missing.
 * Impure so templates re-render when the language signal changes.
 */
@Pipe({ name: 'catName', pure: false })
export class CatNamePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(category: BilingualEntity | null | undefined): string {
    if (!category) {
      return '';
    }
    const { name } = category;
    const localized = this.i18n.language() === 'fr' ? name.fr : name.en;
    return localized || name.en || name.fr || '';
  }
}
