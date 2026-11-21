import { Pipe, PipeTransform } from '@angular/core';

/** Renders a contact as "FirstName LASTNAME" for displays like cards. */
@Pipe({ name: 'fullName' })
export class FullNamePipe implements PipeTransform {
  transform(firstName: string | null | undefined, lastName: string | null | undefined): string {
    const first = (firstName ?? '').trim();
    const last = (lastName ?? '').trim();
    if (!first && !last) {
      return '—';
    }
    if (!first) {
      return last.toUpperCase();
    }
    if (!last) {
      return first;
    }
    return `${first} ${last.toUpperCase()}`;
  }
}
