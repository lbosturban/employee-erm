import { Pipe, PipeTransform } from '@angular/core';
import { composeFullName } from '../models/contact-name.model';
import { ContactName } from '../models/contact-name.model';

/**
 * Extracts up to two clean uppercase initials for the fallback avatar
 * chip. Structured names use their identity tokens directly (skipping
 * honorific titles and middle names): western order takes given + family
 * initials, eastern order family + given. Full-mode or string names fall
 * back to the first initials of the display string; single-token names
 * yield their first two letters; empty names yield "?".
 */
@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(name: ContactName | string | null | undefined): string {
    if (name !== null && name !== undefined && typeof name !== 'string') {
      if (name.mode === 'structured' && (name.firstName.trim() || name.lastName.trim())) {
        // Identity tokens only: titles and middle tokens are ignored and
        // the assembly mirrors the cultural display order.
        const tokens =
          name.culturalOrder === 'eastern'
            ? [name.lastName, name.firstName]
            : [name.firstName, name.lastName];
        const initials = tokens
          .map((token) => firstLetter(token))
          .filter((letter) => letter !== '')
          .join('');
        if (initials !== '') {
          return initials.toUpperCase();
        }
      }
    }
    return initialsFromString(
      name === null || name === undefined ? '' : typeof name === 'string' ? name : composeFullName(name),
    );
  }
}

/** First Unicode letter or digit of a token (skips punctuation/digits like "De", "2e"). */
function firstLetter(token: string): string {
  const match = token.trim().match(/\p{L}|\p{N}/u);
  return match ? match[0] : '';
}

/** Initials from a plain display string (full mode). */
function initialsFromString(value: string): string {
  const words = value
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((word) => word.length > 0);
  if (words.length === 0) {
    return '?';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}
