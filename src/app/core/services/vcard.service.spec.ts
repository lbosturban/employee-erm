import { TestBed } from '@angular/core/testing';
import { ContactService } from './contact.service';
import { CategoryService } from './category.service';
import { VCardService } from './vcard.service';

describe('VCardService', () => {
  let service: VCardService;
  let contactService: ContactService;
  let categoryService: CategoryService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    contactService = TestBed.inject(ContactService);
    categoryService = TestBed.inject(CategoryService);
    service = TestBed.inject(VCardService);
  });

  const contact = () =>
    contactService
      .contacts()
      .find((entry) => entry.email === 'sofia.bernard@novapart.example.com')!;

  describe('buildVCard', () => {
    it('emits a vCard 4.0 payload with the contact fields', () => {
      const sofia = contact();
      const category = categoryService.getById('') ?? categoryService.categories()[2];
      const vcard = service.buildVCard(sofia, category);
      const lines = vcard.split('\r\n');

      expect(lines[0]).toBe('BEGIN:VCARD');
      expect(lines).toContain('VERSION:4.0');
      expect(lines.some((line) => line.startsWith('FN:Sofia Bernard'))).toBe(true);
      expect(lines.some((line) => line.startsWith('N:Bernard;Sofia;;;'))).toBe(true);
      expect(lines.some((line) => line.includes('EMAIL;TYPE=work:sofia.bernard'))).toBe(true);
      expect(lines.some((line) => line.startsWith('ORG:NovaPart'))).toBe(true);
      expect(lines.some((line) => line.startsWith('TITLE:Partnership Manager'))).toBe(true);
      expect(lines.some((line) => line.startsWith('CATEGORIES:'))).toBe(true);
      expect(lines.some((line) => line === 'X-FAVORITE:TRUE')).toBe(true);
      expect(lines[lines.length - 1]).toBe('END:VCARD');
    });

    it('escapes commas, semicolons and newlines in values', () => {
      const sofia = contact();
      const tricky = contactService.update(sofia.id, {
        company: 'Nova, Part; Inc\n Suite 42',
        jobTitle: '',
        notes: '',
      })!;
      const vcard = service.buildVCard(tricky, null);
      expect(vcard).toContain('ORG:Nova\\, Part\\; Inc\\n Suite 42');
      expect(vcard).not.toContain('TITLE:');
    });
  });

  describe('parse', () => {
    it('reads back the card exported by buildVCard', () => {
      const sofia = contact();
      const vcard = service.buildVCard(sofia, categoryService.categories()[2]);
      const cards = service.parse(vcard);

      expect(cards).toHaveLength(1);
      const card = cards[0];
      expect(card.firstName).toBe('Sofia');
      expect(card.lastName).toBe('Bernard');
      expect(card.email).toBe(sofia.email);
      expect(card.phone).toBe(sofia.phone);
      expect(card.company).toBe('NovaPart');
      expect(card.jobTitle).toBe('Partnership Manager');
      expect(card.notes).toBe(sofia.notes);
      expect(card.favorite).toBe(true);
      expect(card.categoryName.split(',')[0].trim().length).toBeGreaterThan(0);
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
