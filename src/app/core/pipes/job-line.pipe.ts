import { Pipe, PipeTransform } from '@angular/core';

/** Joins an optional job title and company into "Title at Company". */
@Pipe({ name: 'jobLine' })
export class JobLinePipe implements PipeTransform {
  transform(jobTitle: string | null | undefined, company: string | null | undefined): string {
    const title = (jobTitle ?? '').trim();
    const companyValue = (company ?? '').trim();
    if (title && companyValue) {
      return `${title} · ${companyValue}`;
    }
    return title || companyValue;
  }
}
