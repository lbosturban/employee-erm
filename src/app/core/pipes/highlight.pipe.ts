import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Highlights occurrences of a search term by wrapping them in <mark>.
 * User-provided HTML is escaped first so only the injected <mark> tag
 * survives sanitization-safe binding.
 */
@Pipe({ name: 'highlight' })
export class HighlightPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(text: string | null | undefined, term: string | null | undefined): SafeHtml {
    const source = text ?? '';
    const escaped = source
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const search = (term ?? '').trim();
    if (!search) {
      return this.sanitizer.bypassSecurityTrustHtml(escaped);
    }
    // Escape regex metacharacters so user input like "(" is literal.
    const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const highlighted = escaped.replace(
      new RegExp(pattern, 'gi'),
      (match) => `<mark>${match}</mark>`,
    );
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
