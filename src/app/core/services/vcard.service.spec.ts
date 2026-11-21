import { TestBed } from '@angular/core/testing';
import { ContactService } from './contact.service';
import { CategoryService } from './category.service';
import { VCardService, toContactDraft } from './vcard.service';
import { MigrationService } from './migration.service';

describe('VCardService', () => {
  let service: VCardService;
  let contactService: ContactService;
  let categoryService: CategoryService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    contactService = TestBed.inject(ContactService);
    categoryService = TestBed.inject(CategoryService);
    service = TestBed.inject(VCardService);
  });

  const claire = () =>
    contactService
      .contacts()
      .find((entry) => entry.email === 'claire.duval@novapart.example.com')!;

  describe('buildVCard', () => {
    it('emits a vCard 4.0 payload with the composed ContactName fields', () => {
      const contact = claire();
      const category = categoryService.getById('') ?? categoryService.categories()[1];
      const vcard = service.buildVCard(contact, category);
      const lines = vcard.split('\r\n');

      expect(lines[0]).toBe('BEGIN:VCARD');
      expect(lines).toContain('VERSION:4.0');
      // FN = composed name (longTitle preferred, middle names included).
      expect(lines.some((line) => line === 'FN:Maître Claire Élodie Duval-Fontaine')).toBe(true);
      // N = family;given;additional;prefix;
      expect(lines.some((line) => line === 'N:Duval-Fontaine;Claire;Élodie;Me.;')).toBe(true);
      expect(lines.some((line) => line.includes('EMAIL;TYPE=work:claire.duval'))).toBe(true);
      // ORG is resolved from the contact's companyId through CompanyService.
      expect(lines.some((line) => line.startsWith('ORG:NovaPart'))).toBe(true);
      expect(lines.some((line) => line.startsWith('TITLE:CEO & Founder'))).toBe(true);
      expect(lines.some((line) => line.startsWith('CATEGORIES:'))).toBe(true);
      expect(lines.some((line) => line === 'X-FAVORITE:TRUE')).toBe(true);
      expect(lines[lines.length - 1]).toBe('END:VCARD');
    });

    it('omits ORG for a contact without a company', () => {
      const contact = contactService
        .contacts()
        .find((entry) => entry.companyId === null)!;
      const vcard = service.buildVCard(contact, null);
      expect(vcard).not.toContain('ORG:');
    });

    it('escapes commas, semicolons and newlines in values', () => {
      const contact = claire();
      const tricky = contactService.update(contact.id, {
        jobTitle: 'Manager; West, Co\n Suite 42',
        notes: '',
      })!;
      const vcard = service.buildVCard(tricky, null);
      expect(vcard).toContain('TITLE:Manager\\; West\\, Co\\n Suite 42');
    });
  });

  describe('parse', () => {
    it('reads back the card exported by buildVCard', () => {
      const contact = claire();
      const vcard = service.buildVCard(contact, categoryService.categories()[1]);
      const cards = service.parse(vcard);

      expect(cards).toHaveLength(1);
      const card = cards[0];
      expect(card.firstName).toBe('Claire');
      expect(card.lastName).toBe('Duval-Fontaine');
      expect(card.email).toBe(contact.email);
      expect(card.phone).toBe(contact.phone);
      expect(card.company).toBe('NovaPart');
      expect(card.jobTitle).toBe('CEO & Founder');
      expect(card.notes).toBe(contact.notes);
      expect(card.favorite).toBe(true);
      expect(card.categoryName.split(',')[0].trim().length).toBeGreaterThan(0);
    });

    it('maps a parsed card to a mode-full contact draft', () => {
      const contact = claire();
      const [card] = service.parse(service.buildVCard(contact, null));
      const draft = toContactDraft(card, null);

      expect(draft.name.mode).toBe('full');
      expect(draft.name.rawFullName).toBe('Claire Duval-Fontaine');
      expect(draft.companyId).toBeNull();
      expect(draft.hrProcessStatus).toBe('Pending');
      expect(draft.jobTitle).toBe('CEO & Founder');
    });

    it('unfolds continuation lines and falls back to FN when N is absent', () => {
      // RFC 6350 unfolding removes CRLF + a single leading WSP, so the
      // trailing space of the first line carries the word separator.
      const vcard = [
        'BEGIN:VCARD',
        'VERSION:4.0',
        'FN:Amina ',
        ' Diallo',
        'EMAIL;TYPE=work:amina.diallo@',
        ' example.com',
        'TEL:+33612345678',
        'END:VCARD',
      ].join('\r\n');
      const [card] = service.parse(vcard);

      expect(card.firstName).toBe('Amina');
      expect(card.lastName).toBe('Diallo');
      expect(card.email).toBe('amina.diallo@example.com');
      expect(card.phone).toBe('+33612345678');
    });

    it('ignores empty bodies and returns no card without fields', () => {
      expect(service.parse('BEGIN:VCARD\nEND:VCARD')).toHaveLength(0);
      expect(service.parse('not a vcard at all')).toHaveLength(0);
    });

    it('maps X-FAVORITE FALSE to a non-favorite contact', () => {
      const [card] = service.parse(
        'BEGIN:VCARD\nVERSION:4.0\nN:Doe;John;;;\nFN:John Doe\nX-FAVORITE:FALSE\nEND:VCARD',
      );
      expect(card?.favorite).toBe(false);
    });
  });
});
