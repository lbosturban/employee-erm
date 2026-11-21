import { Pipe, PipeTransform } from '@angular/core';
import { composeFullName, ContactName } from '../models/contact-name.model';

/**
 * Formats a {@link ContactName} into an accurate display name: the raw
 * full name when the entry is direct ('full' mode), or the composed
 * token sequence honoring the cultural order (family-first for eastern
 * order, honorific titles included). Accepts a plain string too, which
 * passes through unchanged. Renders an em dash for empty names.
 */
@Pipe({ name: 'fullName' })
export class FullNamePipe implements PipeTransform {
  transform(name: ContactName | string | null | undefined): string {
    if (name === null || name === undefined) {
      return '—';
    }
    if (typeof name === 'string') {
      const trimmed = name.trim();
      return trimmed === '' ? '—' : trimmed;
    }
    const composed = composeFullName(name).trim();
    return composed === '' ? '—' : composed;
  }
}
