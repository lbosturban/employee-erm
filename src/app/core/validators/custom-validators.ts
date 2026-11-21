import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ContactName } from '../models/contact-name.model';

/**
 * Email validator writing a practical RFC-5322 subset:
 * `dot-atom@domain` plus dot-string/quoted-string local parts and
 * numeric/labelled domains, with mandatory TLD of 2+ letters and no
 * consecutive dots. Not the full grammar (no comments/folding), which
 * is deliberate: we reject addresses real mail providers reject too.
 * Assumes a non-empty control value (combine with Validators.required).
 */
export function strictEmailValidator(): ValidatorFn {
  // dot-atom or quoted-string local part, then a dotted domain with TLD.
  const EMAIL_PATTERN =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|("[^"\r\n]+"))@((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|([A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*)\.[A-Za-z]{2,})$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === '' || typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    // Guard the grammar hole the regex above cannot express:
    // consecutive dots are forbidden in dot-atom local parts.
    if (trimmed.split('@')[0]?.includes('..')) {
      return { email: true };
    }
    return EMAIL_PATTERN.test(trimmed) ? null : { email: true };
  };
}

/**
 * Phone validator for international and national formats: letters are
 * rejected, separators allowed (spaces, dots, dashes, parentheses,
 * leading +, optional extension suffix). The digits-only payload must
 * contain between 9 and 15 digits (E.164 length range).
 */
export function phoneValidator(): ValidatorFn {
  // Extension suffix may be '#', 'x' or 'ext.' with optional inner
  // whitespace before the digits ("ext 12", "x12", "#456").
  const ALLOWED_PATTERN = /^[+(\d][()+\d\s.-]*((\s|#|x|ext\.?)\s*\d+)?$/i;
  const DIGIT_PATTERN = /\d/g;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === '' || typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!ALLOWED_PATTERN.test(trimmed)) {
      return { phone: true };
    }
    const digitCount = trimmed.match(DIGIT_PATTERN)?.length ?? 0;
    return digitCount >= 9 && digitCount <= 15 ? null : { phone: true };
  };
}

/** Category color validator: accepts #rgb and #rrggbb hex formats. */
export function hexColorValidator(): ValidatorFn {
  const COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === '' || typeof value !== 'string') {
      return null;
    }
    return COLOR_PATTERN.test(value.trim()) ? null : { color: true };
  };
}

/**
 * Reactive-form validator for a {@link ContactName}-shaped group:
 * - `full` mode: `rawFullName` must be non-blank;
 * - `structured` mode: at least one identifying token (first or last
 *   name) must be present.
 * Apply on the parent group holding the name fields; returns
 * `{ contactName: ... }` cause descriptions so the UI can show a
 * targeted message.
 */
export function contactNameValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const mode = group.get('mode')?.value as ContactName['mode'] | null;
    if (mode === null || mode === undefined) {
      return null; // not a name group (or untouched): nothing to validate
    }
    if (mode === 'full') {
      const raw = String(group.get('rawFullName')?.value ?? '').trim();
      return raw === '' ? { contactName: { cause: 'rawFullName' } } : null;
    }
    const firstName = String(group.get('firstName')?.value ?? '').trim();
    const lastName = String(group.get('lastName')?.value ?? '').trim();
    if (firstName === '' && lastName === '') {
      return { contactName: { cause: 'tokens' } };
    }
    return null;
  };
}
