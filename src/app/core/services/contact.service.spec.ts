import { TestBed } from '@angular/core/testing';
import { ContactService } from './contact.service';
import { CategoryService } from './category.service';

describe('ContactService', () => {
  let service: ContactService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContactService);
  });

  it('seeds demo contacts on first launch and persists them', () => {
    expect(service.total()).toBe(3);
    expect(JSON.parse(window.localStorage.getItem('contacts-erm:contacts') ?? '[]').length).toBe(3);
  });

  it('creates a contact with generated id, defaults and timestamps', () => {
    const created = service.create({
      firstName: 'Léa',
      lastName: 'Petit',
      email: 'lea.petit@example.com',
      phone: '+33 6 11 22 33 44',
      company: 'Acme',
      jobTitle: '',
      categoryId: null,
      favorite: false,
      notes: '',
    });
    expect(created).not.toBeNull();
    if (!created) {
      return;
    }
    expect(created.id).toMatch(/.+/);
    expect(created.favorite).toBe(false);
    expect(created.createdAt).toBe(created.updatedAt);
    expect(service.total()).toBe(4);
  });

  it('updates a contact and refreshes updatedAt only', () => {
    const seed = service.contacts()[0];
    const updated = service.update(seed.id, { firstName: 'Renamed' });
    expect(updated?.firstName).toBe('Renamed');
    expect(updated?.createdAt).toBe(seed.createdAt);
    expect(updated && updated.updatedAt >= seed.updatedAt).toBe(true);
  });

  it('toggles the favorite flag', () => {
    const seed = service.contacts()[0];
    const before = seed.favorite;
    expect(service.toggleFavorite(seed.id)?.favorite).toBe(!before);
    expect(service.toggleFavorite(seed.id)?.favorite).toBe(before);
  });

  it('removes a contact', () => {
    const seed = service.contacts()[0];
    const count = service.total();
    expect(service.remove(seed.id)).toBe(true);
    expect(service.total()).toBe(count - 1);
    expect(service.getById(seed.id)).toBeNull();
  });

  it('returns null when updating or toggling an unknown id', () => {
    expect(service.update('unknown', { firstName: 'X' })).toBeNull();
    expect(service.toggleFavorite('unknown')).toBeNull();
    expect(service.remove('unknown')).toBe(false);
  });

  it('filters contacts by category', () => {
    const categories = TestBed.inject(CategoryService).categories();
    const categoryId = categories[0].id;
    const contacts = service.getByCategory(categoryId);
    expect(contacts.length).toBeGreaterThan(0);
    expect(contacts.every((contact) => contact.categoryId === categoryId)).toBe(true);
  });

  it('replaces the whole state during an import', () => {
    const categories = TestBed.inject(CategoryService).categories();
    const snapshot = {
      contacts: [
        {
          id: 'imported-1',
          firstName: 'Imported',
          lastName: 'Person',
          email: 'imported@example.com',
          phone: '0000',
          company: '',
          jobTitle: '',
          categoryId: categories[0].id,
          favorite: false,
          notes: '',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      categories,
    };
    expect(service.replaceAll(snapshot)).toBe(true);
    expect(service.total()).toBe(1);
    expect(service.contacts()[0].id).toBe('imported-1');
  });
});
