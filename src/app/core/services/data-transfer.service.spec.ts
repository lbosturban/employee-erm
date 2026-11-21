import { TestBed } from '@angular/core/testing';
import { DataTransferService } from './data-transfer.service';
import { MigrationService, SCHEMA_VERSION } from './migration.service';
import { ContactService } from './contact.service';
import { CategoryService } from './category.service';
import { CompanyService } from './company.service';
import { DataSnapshot } from '../models/snapshot.model';

describe('DataTransferService', () => {
  let service: DataTransferService;
  let snapshot: DataSnapshot;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    service = TestBed.inject(DataTransferService);
    snapshot = {
      schemaVersion: SCHEMA_VERSION,
      categories: TestBed.inject(CategoryService).categories(),
      companies: TestBed.inject(CompanyService).companies(),
      contacts: TestBed.inject(ContactService).contacts(),
    };
  });

  /** Serialization side of the export path, fed back into import as a File. */
  async function roundTrip(): Promise<DataSnapshot> {
    // Testing the import path directly with the serialized snapshot:
    // the export browser download side effect cannot be observed in jsdom.
    const file = new File([JSON.stringify(snapshot)], 'import.json', { type: 'application/json' });
    return service.import(file);
  }

  it('round-trips a valid full snapshot', async () => {
    const result = await roundTrip();
    expect(result.contacts.length).toBe(9);
    expect(result.companies.length).toBe(7);
    expect(result.categories.length).toBe(4);
  });

  it('exports without throwing', () => {
    expect(() => service.export(snapshot)).not.toThrow();
  });

  it('rejects malformed JSON with a descriptive error', async () => {
    const file = new File(['{nope'], 'bad.json', { type: 'application/json' });
    await expect(service.import(file)).rejects.toThrow(/malformed JSON/i);
  });

  it('rejects snapshots missing the companies array', async () => {
    const file = new File(
      [JSON.stringify({ schemaVersion: SCHEMA_VERSION, categories: [], contacts: [] })],
      'old.json',
      { type: 'application/json' },
    );
    await expect(service.import(file)).rejects.toThrow(/companies/);
  });

  it('rejects snapshots from a newer schema version', async () => {
    const future = { ...snapshot, schemaVersion: SCHEMA_VERSION + 1 };
    const file = new File([JSON.stringify(future)], 'future.json', { type: 'application/json' });
    await expect(service.import(file)).rejects.toThrow(/schema version/i);
  });

  it('rejects snapshots with an invalid contact', async () => {
    const broken = {
      ...snapshot,
      contacts: [{ ...snapshot.contacts[0], name: 'not-an-object' }],
    };
    const file = new File([JSON.stringify(broken)], 'broken.json', { type: 'application/json' });
    await expect(service.import(file)).rejects.toThrow(/invalid contact/i);
  });

  it('rejects snapshots with duplicate ids', async () => {
    const broken = { ...snapshot, contacts: [snapshot.contacts[0], snapshot.contacts[0]] };
    const file = new File([JSON.stringify(broken)], 'dup.json', { type: 'application/json' });
    await expect(service.import(file)).rejects.toThrow(/duplicate contact id/i);
  });

  it('rejects snapshots with a dangling category foreign key', async () => {
    const broken = {
      ...snapshot,
      contacts: [{ ...snapshot.contacts[0], categoryId: 'ghost-category' }],
    };
    const file = new File([JSON.stringify(broken)], 'fk.json', { type: 'application/json' });
    await expect(service.import(file)).rejects.toThrow(/unknown category/i);
  });

  it('rejects snapshots where a company references a non-existent CEO', async () => {
    // Only the first company is ghosted; the others keep their rows so
    // their contacts' foreign keys stay valid.
    const broken = {
      ...snapshot,
      companies: snapshot.companies.map((company, index) =>
        index === 0 ? { ...company, contactId: 'ghost-contact' } : company,
      ),
    };
    const file = new File([JSON.stringify(broken)], 'ceo.json', { type: 'application/json' });
    await expect(service.import(file)).rejects.toThrow(/CEO/i);
  });
});
