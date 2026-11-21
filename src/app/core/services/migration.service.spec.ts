import { TestBed } from '@angular/core/testing';
import { MigrationService, SCHEMA_VERSION } from './migration.service';
import { StorageService } from './storage.service';

describe('MigrationService', () => {
  let service: MigrationService;
  let storage: StorageService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(MigrationService);
    storage = TestBed.inject(StorageService);
  });

  it('seeds the full dataset when no schema version exists', () => {
    service.run();
    expect(storage.read<unknown[]>('contacts')?.length).toBe(9);
    expect(storage.read<unknown[]>('categories')?.length).toBe(4);
    expect(storage.read<unknown[]>('companies')?.length).toBe(7);
    expect(storage.read<number>('schemaVersion')).toBe(SCHEMA_VERSION);
    expect(service.freshlySeeded()).toBe(true);
  });

  it('leaves data intact when the stored version matches', () => {
    storage.write('contacts', [{ id: 'kept' }]);
    storage.write('schemaVersion', SCHEMA_VERSION);
    service.run();
    expect(storage.read<{ id: string }[]>('contacts')).toEqual([{ id: 'kept' }]);
    expect(service.freshlySeeded()).toBe(false);
  });

  it('wipes and reseeds when the stored version is unknown or too old', () => {
    storage.write('contacts', [{ id: 'ancient' }]);
    storage.write('companies', [{ id: 'ancient' }]);
    storage.write('categories', [{ id: 'ancient' }]);
    storage.write('schemaVersion', -1);
    service.run();
    expect(storage.read<unknown[]>('contacts')?.length).toBe(9);
    expect(storage.read<unknown[]>('companies')?.length).toBe(7);
    expect(storage.read<unknown[]>('categories')?.length).toBe(4);
    // Preferences are part of the old schema: they are reset too.
    expect(storage.read<string>('lang')).toBeNull();
    expect(service.freshlySeeded()).toBe(true);
  });

  it('seeds a coherent dataset (CEO links resolve to existing contacts)', () => {
    service.run();
    const contactIds = new Set(storage.read<{ id: string }[]>('contacts')?.map((c) => c.id));
    for (const company of storage.read<{ contactId: string | null }[]>('companies') ?? []) {
      if (company.contactId !== null) {
        expect(contactIds.has(company.contactId)).toBe(true);
      }
    }
  });
});
