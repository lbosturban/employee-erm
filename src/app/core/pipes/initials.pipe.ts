import { Pipe, PipeTransform } from '@angular/core';

/** Extracts up to two uppercase initials for avatar chips. */
@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(firstName: string | null | undefined, lastName: string | null | undefined): string {
    const firstInitial = (firstName ?? '').trim().charAt(0);
    const lastInitial = (lastName ?? '').trim().charAt(0);
    const initials = `${firstInitial}${lastInitial}`.toUpperCase();
    return initials.length > 0 ? initials : '?';
  }
}
