import { TestBed } from '@angular/core/testing';
import { ContactService } from './contact.service';
import { CategoryService } from './category.service';
import { MigrationService } from './migration.service';
import { Contact } from '../models/contact.model';
import { emptyContactName } from '../models/contact-name.model';

describe('ContactService', () => {
  let service: ContactService;
  let migration: MigrationService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    // Domain services no longer seed themselves: the schema layer does.
    migration = TestBed.inject(MigrationService);
    migration.run();
    service = TestBed.inject(ContactService);
  });

  it('seeds the rich sample dataset on first launch and persists it', () => {
    expect(service.total()).toBe(9);
    expect(
      JSON.parse(window.localStorage.getItem('contacts-erm:contacts') ?? '[]').length,
    ).toBe(9);
  });

  it('keeps existing data untouched when the schema version matches', () => {
    const before = service.contacts();
    migration.run();
    expect(service.contacts()).toEqual(before);
  });

  it('creates a contact with generated id, name object and timestamps', () => {
    const created = service.create({
      name: { ...emptyContactName(), mode: 'full', rawFullName: 'Léa Petit' },
      jobTitle: '',
      email: 'lea.petit@example.com',
      phone: '+33 6 11 22 33 44',
      city: 'Paris',
      companyId: null,
      isCompanyActive: false,
      hrProcessStatus: 'Pending',
      categoryId: null,
      favorite: false,
      notes: '',
      profileImageUrl: '',
      profileImageAlt: '',
    });
    expect(created).not.toBeNull();
    if (!created) {
      return;
    }
    expect(created.id).toMatch(/.+/);
    expect(created.favorite).toBe(false);
    expect(created.addedAt).toBe(created.updatedAt);
    expect(service.total()).toBe(10);
  });

  it('updates a contact and refreshes updatedAt only', () => {
    const seed = service.contacts()[0];
    const updated = service.update(seed.id, {
      name: { ...seed.name, firstName: 'Renamed' },
    });
    expect(updated?.name.firstName).toBe('Renamed');
    expect(updated?.addedAt).toBe(seed.addedAt);
    expect(updated && updated.updatedAt >= seed.updatedAt).toBe(true);
  });

  it('toggles the favorite flag', () => {
    const seed = service.contacts()[0];
    const before = seed.favorite;
    expect(service.toggleFavorite(seed.id)?.favorite).toBe(!before);
    expect(service.toggleFavorite(seed.id)?.favorite).toBe(before);
  });

  it('exposes an HR lifecycle breakdown', () => {
    const counts = service.hrStatusCounts();
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(service.total());
    expect(counts.Archived).toBeGreaterThan(0);
    expect(counts.Pending).toBeGreaterThan(0);
  });

  it('exposes company-active vs inactive counts', () => {
    expect(service.companyActiveCount() + service.companyInactiveCount()).toBe(service.total());
    expect(service.companyInactiveCount()).toBeGreaterThan(0);
  });

  it('filters contacts by category and by company', () => {
    const categoryId = service.contacts()[0].categoryId;
    if (!categoryId) {
      return;
    }
    const byCategory = service.getByCategory(categoryId);
    expect(byCategory.length).toBeGreaterThan(0);
    expect(byCategory.every((contact) => contact.categoryId === categoryId)).toBe(true);

    const companyId = service.contacts().find((c) => c.companyId !== null)?.companyId;
    if (!companyId) {
      return;
    }
    const byCompany = service.getByCompany(companyId);
    expect(byCompany.length).toBeGreaterThan(0);
    expect(byCompany.every((contact: Contact) => contact.companyId === companyId)).toBe(true);
  });

  it('matches search terms across structured name tokens', () => {
    // The eastern-order contact (Tanaka, middle "Kenji") must be findable
    // by given name, family name and middle token alike.
    expect(service.contacts().some((c) => service.matchesSearch(c, 'kenji'))).toBe(true);
    expect(service.contacts().some((c) => service.matchesSearch(c, 'tanaka'))).toBe(true);
    expect(service.contacts().some((c) => service.matchesSearch(c, 'hiroshi'))).toBe(true);
    // Searches also cover email and city.
    expect(service.contacts().some((c) => service.matchesSearch(c, 'munich'))).toBe(true);
    expect(service.matchesSearch(service.contacts()[0], 'zzz-no-match')).toBe(false);
  });

  it('removes a contact', () => {
    const seed = service.contacts()[0];
    const count = service.total();
    expect(service.remove(seed.id)).toBe(true);
    expect(service.total()).toBe(count - 1);
    expect(service.getById(seed.id)).toBeNull();
  });

  it('returns null when updating or toggling an unknown id', () => {
    expect(service.update('unknown', { favorite: true })).toBeNull();
    expect(service.toggleFavorite('unknown')).toBeNull();
    expect(service.remove('unknown')).toBe(false);
  });

  it('replaces the whole state during an import', () => {
    const categories = TestBed.inject(CategoryService).categories();
    const imported: Contact = {
      id: 'imported-1',
      name: { ...emptyContactName(), mode: 'full', rawFullName: 'Imported Person' },
      jobTitle: '',
      email: 'imported@example.com',
      phone: '+33 1 00 00 00 00',
      city: '',
      companyId: null,
      isCompanyActive: false,
      hrProcessStatus: 'Active',
      categoryId: categories[0].id,
      favorite: false,
      notes: '',
      profileImageUrl: '',
      profileImageAlt: '',
      addedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    expect(service.replaceAll([imported])).toBe(true);
    expect(service.total()).toBe(1);
    expect(service.contacts()[0].id).toBe('imported-1');
  });
});
