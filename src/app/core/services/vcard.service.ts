import { Injectable, inject } from '@angular/core';
import { Contact } from '../models/contact.model';
import { Category } from '../models/category.model';
import { I18nService } from './i18n.service';
import { ContactDraft } from './contact.service';

const CRLF = '\r\n';

/** A parsed vCard reduced to the fields the ERM understands. */
export interface ParsedVCard {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  notes: string;
  favorite: boolean;
  /** Raw CATEGORIES value, used to re-attach an existing category. */
  categoryName: string;
}

/**
 * vCard 4.0 (RFC 6350) import/export for contacts. Kept as a standalone
 * service so the format logic is testable and swappable by a backend.
 */
@Injectable({ providedIn: 'root' })
export class VCardService {
  private readonly i18n = inject(I18nService);

  /** Builds and downloads a `.vcf` file for one contact. */
  exportContact(contact: Contact, category: Category | null): void {
    const vcard = this.buildVCard(contact, category);
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${contact.firstName}-${contact.lastName}.vcf`
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-');
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Parses a `.vcf`/`.vcard` payload into draft contacts. Unfolds
   * continuation lines (leading space/tab, RFC 6350 §3.2) and unescapes
   * `\\n`, `\\,` and `\\;` sequences before mapping to ERM fields.
   */
  parse(fileContent: string): ParsedVCard[] {
    const unfolded = fileContent
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n[ \t]/g, '');
    const cards: ParsedVCard[] = [];
    for (const block of unfolded.split(/BEGIN:VCARD/i).slice(1)) {
      const end = /END:VCARD/i.exec(block);
      if (!end) {
        continue;
      }
      const card = this.parseCard(block.slice(0, end.index));
      if (card) {
        cards.push(card);
      }
    }
    return cards;
  }

  /** Serialization step kept public for tests and future sync layers. */
  buildVCard(contact: Contact, category: Category | null): string {
    const rev = contact.updatedAt.replace(/[-:]/g, '').replace(/\.\d+/, '');
    return [
      'BEGIN:VCARD',
      'VERSION:4.0',
      `UID:${contact.id}`,
      `N:${this.escape(contact.lastName)};${this.escape(contact.firstName)};;;`,
      `FN:${this.escape(`${contact.firstName} ${contact.lastName}`)}`,
      `TEL;TYPE=cell:${this.escape(contact.phone)}`,
      `EMAIL;TYPE=work:${this.escape(contact.email)}`,
      contact.company ? `ORG:${this.escape(contact.company)}` : null,
      contact.jobTitle ? `TITLE:${this.escape(contact.jobTitle)}` : null,
      contact.notes ? `NOTE:${this.escape(contact.notes)}` : null,
      category ? `CATEGORIES:${this.escape(this.categoryName(category))}` : null,
      `X-FAVORITE:${contact.favorite ? 'TRUE' : 'FALSE'}`,
      `REV:${rev}`,
      'END:VCARD',
    ]
      .filter((line): line is string => line !== null)
      .join(CRLF);
  }

  private parseCard(body: string): ParsedVCard | null {
    const lines = body.split('\n').filter((line) => line.trim().length > 0);
    let lastName = '';
    let firstName = '';
    let displayName = '';
    let email = '';
    let phone = '';
    let company = '';
    let jobTitle = '';
    let notes = '';
    let favorite = false;
    let categoryName = '';
    for (const line of lines) {
      const separator = line.indexOf(':');
      if (separator === -1) {
        continue;
      }
      const name = line.slice(0, separator).split(';')[0].trim().toUpperCase();
      const value = this.unescape(line.slice(separator + 1)).trim();
      switch (name) {
        case 'N': {
          const parts = value.split(';');
          lastName = (parts[0] ?? '').trim();
          firstName = (parts[1] ?? '').trim();
          break;
        }
        case 'FN':
          displayName = value;
          break;
        case 'EMAIL':
          email = email || value;
          break;
        case 'TEL':
          phone = phone || value;
          break;
        case 'ORG':
          company = value.split(';')[0].trim();
          break;
        case 'TITLE':
          jobTitle = value;
          break;
        case 'NOTE':
          notes = notes ? `${notes}\n${value}` : value;
          break;
        case 'CATEGORIES':
          categoryName = value.split(',')[0].trim();
          break;
        case 'X-FAVORITE':
          favorite = value.toUpperCase() === 'TRUE';
          break;
      }
    }
    // FN is the fallback when N is missing or incomplete.
    if (!firstName && !lastName && displayName) {
      const parts = displayName.split(/\s+/);
      firstName = parts.shift() ?? '';
      lastName = parts.join(' ');
    }
    if (!firstName && !lastName && !email && !phone) {
      return null;
    }
    return {
      firstName: firstName || '-',
      lastName,
      email,
      phone,
      company,
      jobTitle,
      notes,
      favorite,
      categoryName,
    };
  }

  /** Name in the active language, for the CATEGORIES property. */
  private categoryName(category: Category): string {
    const name = category.name;
    return this.i18n.language() === 'fr' ? name.fr || name.en : name.en || name.fr;
  }

  private escape(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  private unescape(value: string): string {
    return value
      .replace(/\\n/gi, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }
}

/** Helper used by callers to turn parsed cards into contact drafts. */
export function toContactDraft(card: ParsedVCard, categoryId: string | null): ContactDraft {
  return {
    firstName: card.firstName.slice(0, 50),
    lastName: card.lastName.slice(0, 50),
    email: card.email.slice(0, 120),
    phone: card.phone.slice(0, 40),
    company: card.company.slice(0, 80),
    jobTitle: card.jobTitle.slice(0, 80),
    categoryId,
    favorite: card.favorite,
    notes: card.notes.slice(0, 500),
  };
}
