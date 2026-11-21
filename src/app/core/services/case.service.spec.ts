import { TestBed } from '@angular/core/testing';
import { CaseService } from './case.service';
import { MigrationService } from './migration.service';
import { CrmCase } from '../models/phase2/case.model';

/** Matches an RFC3339 UTC timestamp such as 2026-02-15T10:30:00.123Z. */
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

describe('CaseService', () => {
  let service: CaseService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    service = TestBed.inject(CaseService);
  });

  it('creates a case with a generated id, RFC3339 timestamps, prepended', () => {
    const before = service.cases().map((entry) => entry.id);
    const created = service.create({
      kind: 'conflict',
      title: '  Desk-move dispute  ',
      description: 'Two colleagues assigned to the same desk.',
      contactIds: ['contact-a', 'contact-b'],
      companyId: null,
      status: 'open',
    });

    expect(created).not.toBeNull();
    expect(created.id).not.toBe('');
    expect(created.title).toBe('Desk-move dispute'); // trimmed
    expect(created.createdAt).toMatch(RFC3339);
    expect(created.updatedAt).toMatch(RFC3339);
    // New case sits at the head of the list.
    expect(service.cases().map((entry) => entry.id)).toEqual([created.id, ...before]);
    expect(service.total()).toBe(5);
  });

  it('returns null (without throwing) when updating an unknown id', () => {
    expect(() => service.update('does-not-exist', { title: 'Nope' })).not.toThrow();
    expect(service.update('does-not-exist', { title: 'Nope' })).toBeNull();
  });

  it('update refreshes updatedAt but keeps createdAt', () => {
    const seeded = service.cases()[0];
    // Backdate the record so updatedAt is measurably older than "now".
    const past = new Date(Date.now() - 86_400_000).toISOString();
    service.replaceAll([{ ...seeded, createdAt: past, updatedAt: past }]);

    const updated = service.update(seeded.id, { title: 'Renamed case' });
    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('Renamed case');
    expect(updated?.createdAt).toBe(past);
    expect(updated?.updatedAt).not.toBe(past);
    expect(service.getById(seeded.id)?.updatedAt).toBe(updated?.updatedAt);
  });

  it('casesForContact returns only cases that contain the contact', () => {
    // Seeded cases span several contacts; pick one from the seed content.
    const concernedContactId = service.cases()[0].contactIds[0];
    const expectedIds = service
      .cases()
      .filter((entry) => entry.contactIds.includes(concernedContactId))
      .map((entry) => entry.id);

    const result = service.casesForContact(concernedContactId);
    expect(result.map((entry) => entry.id)).toEqual(expectedIds);
    // Every returned case really references the contact.
    for (const entry of result) {
      expect(entry.contactIds).toContain(concernedContactId);
    }
    // A contact not listed in any case yields nothing.
    expect(service.casesForContact('contact-never-seeded')).toEqual([]);
  });

  it('removes an existing case (true) and rejects an unknown id (false)', () => {
    const victim = service.cases()[0].id;
    expect(service.remove(victim)).toBe(true);
    expect(service.getById(victim)).toBeNull();
    expect(service.total()).toBe(3);
    expect(service.remove(victim)).toBe(false);
    expect(service.remove('never-existed')).toBe(false);
  });

  it('countByKind and countByStatus match the seeded cases', () => {
    expect(service.total()).toBe(4);
    expect(service.countByKind()).toEqual(
      new Map<string, number>([
        ['irritant', 1],
        ['conflict', 1],
        ['complaint', 1],
        ['mediation', 1],
      ]),
    );
    expect(service.countByStatus()).toEqual(
      new Map<string, number>([
        ['open', 2],
        ['observed', 1],
        ['resolved', 1],
      ]),
    );
  });

  it('replaceAll swaps the whole state', () => {
    const imported: CrmCase[] = [
      {
        id: 'imported-1',
        kind: 'complaint',
        title: 'Imported complaint',
        description: 'Came in via JSON import.',
        contactIds: ['imported-contact'],
        companyId: null,
        status: 'observed',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    expect(service.replaceAll(imported)).toBe(true);
    expect(service.total()).toBe(1);
    expect(service.cases()[0].id).toBe('imported-1');
    expect(service.getById('imported-1')?.status).toBe('observed');
  });
});
