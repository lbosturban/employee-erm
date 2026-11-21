import { Injectable, inject } from '@angular/core';
import { Contact, ContactDraft } from '../models/contact.model';
import { Category } from '../models/category.model';
import { composeFullName, ContactName } from '../models/contact-name.model';
import { I18nService } from './i18n.service';
import { CompanyService } from './company.service';

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

/** Decomposed vCard `N` property (RFC 6350 §6.2.2 components). */
interface NameComponents {
  /** Family name(s), semicolon component 0. */
  family: string;
  /** Given name(s), component 1. */
  given: string;
  /** Additional (middle) names, space-separated inside component 2. */
  additional: string;
  /** Honorific title prefix, component 3. */
  prefix: string;
}

/**
 * vCard 4.0 (RFC 6350) import/export for contacts. Kept as a standalone
 * service so the format logic is testable and swappable by a backend.
 */
@Injectable({ providedIn: 'root' })
export class VCardService {
  private readonly i18n = inject(I18nService);
  private readonly companyService = inject(CompanyService);

  /** Builds and downloads a `.vcf` file for one contact. */
  exportContact(contact: Contact, category: Category | null): void {
    const vcard = this.buildVCard(contact, category);
    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${composeFullName(contact.name)}.vcf`
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
    const n = serializeNameComponents(contact.name);
    const companyName = contact.companyId
      ? (this.companyService.getById(contact.companyId)?.name ?? '')
      : '';
    return [
      'BEGIN:VCARD',
      'VERSION:4.0',
      `UID:${contact.id}`,
      `N:${this.escape(n.family)};${this.escape(n.given)};${this.escape(n.additional)};${this.escape(n.prefix)};`,
      `FN:${this.escape(composeFullName(contact.name))}`,
      `TEL;TYPE=cell:${this.escape(contact.phone)}`,
      `EMAIL;TYPE=work:${this.escape(contact.email)}`,
      companyName ? `ORG:${this.escape(companyName)}` : null,
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

/**
 * Maps a {@link ContactName} onto the RFC 6350 `N` components:
 * family;given;additional;prefix;. Structured names keep their tokens;
 * 'full' names are split heuristically (first word = given, last word =
 * family, the rest additional). The abbreviated honorific is preferred
 * as prefix, falling back to the spelled-out one.
 */
function serializeNameComponents(name: ContactName): NameComponents {
  if (name.mode === 'full') {
    const words = name.rawFullName.trim().split(/\s+/).filter((word) => word !== '');
    const given = words.length >= 2 ? (words[0] ?? '') : words.join(' ');
    const family = words.length >= 2 ? (words[words.length - 1] ?? '') : '';
    const additional = words.slice(1, Math.max(1, words.length - 1)).join(' ');
    return { family, given, additional, prefix: name.shortTitle || name.longTitle || '' };
  }
  return {
    family: name.lastName.trim(),
    given: name.firstName.trim(),
    additional: (name.middleNames ?? []).map((token) => token.trim()).filter((t) => t !== '').join(' '),
    prefix: name.shortTitle || name.longTitle || '',
  };
}

/**
 * Helper used by callers to turn parsed cards into contact drafts.
 * Imported names always land as `mode: 'full'` (verbatim free text);
 * the company reference stays null unless the caller resolves an ORG
 * match beforehand.
 */
export function toContactDraft(
  card: ParsedVCard,
  categoryId: string | null,
  companyId: string | null = null,
): ContactDraft {
  const firstName = card.firstName.slice(0, 50).trim();
  const lastName = card.lastName.slice(0, 50).trim();
  const rawFullName = `${firstName} ${lastName}`.trim();
  return {
    name: {
      mode: 'full',
      rawFullName,
      shortTitle: '',
      longTitle: '',
      firstName: '',
      middleNames: [],
      lastName: '',
      culturalOrder: 'western',
    },
    jobTitle: card.jobTitle.slice(0, 80),
    email: card.email.slice(0, 120),
    phone: card.phone.slice(0, 40),
    city: '',
    companyId,
    isCompanyActive: false,
    hrProcessStatus: 'Pending',
    categoryId,
    favorite: card.favorite,
    notes: card.notes.slice(0, 500),
    profileImageUrl: '',
    profileImageAlt: rawFullName,
  };
}
