import { TestBed } from '@angular/core/testing';
import { LegalElementsService } from './legal-elements.service';
import { MigrationService } from './migration.service';
import { LEGAL_SECTION_KINDS } from '../models/phase2/legal-elements.model';

describe('LegalElementsService', () => {
  let service: LegalElementsService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    service = TestBed.inject(LegalElementsService);
  });

  it('creates an empty bundle with a generated id and timestamp', () => {
    const before = service.bundles().length;
    const created = service.create({
      contactId: 'contact-a',
      companyId: null,
      references: [],
    });

    expect(created).not.toBeNull();
    expect(created.id).not.toBe('');
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.references).toEqual([]);
    expect(service.bundles().length).toBe(before + 1);
    expect(service.bundles()[0].id).toBe(created.id);
  });

  it('addReference appends the reference and generates its id', () => {
    const seeded = service.bundles()[0];
    const countBefore = seeded.references.length;

    const added = service.addReference(seeded.id, {
      kind: 'contracts',
      label: 'Consultant contract, clause 4 (confidentiality)',
      location: 'Contracts archive / NovaPart / Consultants',
      externalUrl: null,
    });

    expect(added).not.toBeNull();
    expect(added?.id).not.toBe('');
    const bundle = service.getById(seeded.id);
    expect(bundle?.references).toHaveLength(countBefore + 1);
    expect(bundle?.references.at(-1)?.id).toBe(added?.id);
    expect(bundle?.references.at(-1)?.label).toBe(
      'Consultant contract, clause 4 (confidentiality)',
    );
    expect(service.addReference('bundle-never-seeded', { kind: 'contracts', label: 'x', location: 'y', externalUrl: null })).toBeNull();
  });

  it('referencesBySection maps a reference into each of the four section kinds', () => {
    const seeded = service.bundles()[0]; // seeded with one reference per kind
    const sections = service.referencesBySection(seeded);

    for (const kind of LEGAL_SECTION_KINDS) {
      const bucket = sections.get(kind);
      expect(bucket).toBeDefined();
      expect(bucket).toHaveLength(1);
      expect(bucket?.[0].kind).toBe(kind);
    }
    // The seeded bundle holds exactly the four taxonomy buckets.
    expect(sections.size).toBe(LEGAL_SECTION_KINDS.length);
  });

  it('removeReference removes a known reference and refuses unknown ones', () => {
    const seeded = service.bundles()[0];
    const referenceId = seeded.references[0].id;

    expect(service.removeReference(seeded.id, referenceId)).toBe(true);
    expect(service.getById(seeded.id)?.references.some((r) => r.id === referenceId)).toBe(false);
    expect(service.getById(seeded.id)?.references).toHaveLength(seeded.references.length - 1);
    // Same reference twice, unknown reference, unknown bundle:
    expect(service.removeReference(seeded.id, referenceId)).toBe(false);
    expect(service.removeReference(seeded.id, 'reference-never-seeded')).toBe(false);
    expect(service.removeReference('bundle-never-seeded', referenceId)).toBe(false);
  });

  it('removes a bundle and rejects an unknown id', () => {
    const victim = service.bundles()[0].id;
    expect(service.remove(victim)).toBe(true);
    expect(service.getById(victim)).toBeNull();
    expect(service.bundles()).toHaveLength(0);
    expect(service.remove(victim)).toBe(false);
    expect(service.remove('never-existed')).toBe(false);
  });

  it('returns null when updating an unknown bundle id', () => {
    expect(() => service.update('does-not-exist', { contactId: 'contact-b' })).not.toThrow();
    expect(service.update('does-not-exist', { contactId: 'contact-b' })).toBeNull();
  });
});
