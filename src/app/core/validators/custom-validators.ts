import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Stricter email validator than Angular's built-in one: requires a TLD.
 * Assumes a non-empty control value (combine with Validators.required).
 */
export function strictEmailValidator(): ValidatorFn {
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === '' || typeof value !== 'string') {
      return null;
    }
    return EMAIL_PATTERN.test(value.trim()) ? null : { email: true };
  };
}

/**
 * Phone validator: letters are rejected, and the digits-only payload must
 * contain between 9 and 15 digits (E.164 length range). Accepted separators:
 * spaces, dots, dashes, parentheses and a leading +.
 */
export function phoneValidator(): ValidatorFn {
  const ALLOWED_PATTERN = /^[+()\d\s.-]+$/;
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
