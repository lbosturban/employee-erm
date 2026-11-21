import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../services/i18n.service';
import { Language } from '../services/i18n.service';

/**
 * Translate pipe for the minimal FR/EN i18n layer.
 * It is impure on purpose: it reads the language signal internally, which
 * lets every translated text re-render as soon as the language changes.
 * Updates automatically when the active language changes.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string): string {
    return this.i18n.translate(key);
  }
}

export type { Language };
