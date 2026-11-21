import { TestBed } from '@angular/core/testing';
import { EscalationService } from './escalation.service';
import { MigrationService } from './migration.service';

/** Matches an RFC3339 UTC timestamp such as 2026-02-15T10:30:00.123Z. */
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

describe('EscalationService', () => {
  let service: EscalationService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    service = TestBed.inject(EscalationService);
  });

  it('creates an escalation with a generated id and creation timestamp', () => {
    const before = service.escalations().length;
    const created = service.create({
      sourceContactId: 'contact-a',
      targetContactId: 'contact-b',
      sourceLevel: 'superior',
      targetLevel: 'hr',
      purpose: 'sanction',
      mediationCaseId: null,
      notes: '  Disciplinary step requested.  ',
    });

    expect(created).not.toBeNull();
    expect(created.id).not.toBe('');
    expect(created.notes).toBe('Disciplinary step requested.'); // trimmed
    expect(created.createdAt).toMatch(RFC3339);
    expect(service.escalations().length).toBe(before + 1);
    expect(service.escalations()[0].id).toBe(created.id);
    expect(service.getById(created.id)).not.toBeNull();
  });

  it('escalationsForContact matches both the source and the target side', () => {
    const seeded = service.escalations()[0];
    // As initiator (source side):
    const asSource = service.escalationsForContact(seeded.sourceContactId);
    expect(asSource.some((entry) => entry.id === seeded.id)).toBe(true);
    // As escalated-against contact (target side):
    const asTarget = service.escalationsForContact(seeded.targetContactId);
    expect(asTarget.some((entry) => entry.id === seeded.id)).toBe(true);
    // Unrelated contacts yield nothing.
    expect(service.escalationsForContact('contact-never-seeded')).toEqual([]);
  });

  it('returns null (without throwing) when updating an unknown id', () => {
    expect(() => service.update('does-not-exist', { purpose: 'sanction' })).not.toThrow();
    expect(service.update('does-not-exist', { purpose: 'sanction' })).toBeNull();
  });

  it('update modifies the purpose while keeping id and createdAt', () => {
    const seeded = service.escalations()[0];
    const updated = service.update(seeded.id, { purpose: 'legal-action' });

    expect(updated).not.toBeNull();
    expect(updated?.purpose).toBe('legal-action');
    expect(updated?.id).toBe(seeded.id);
    expect(updated?.createdAt).toBe(seeded.createdAt);
    expect(service.getById(seeded.id)?.purpose).toBe('legal-action');
  });

  it('removes an existing escalation and rejects an unknown id', () => {
    const victim = service.escalations()[0].id;
    expect(service.remove(victim)).toBe(true);
    expect(service.getById(victim)).toBeNull();
    expect(service.total()).toBe(1);
    expect(service.remove(victim)).toBe(false);
    expect(service.remove('never-existed')).toBe(false);
  });

  it('countByPurpose matches the seeded escalations', () => {
    expect(service.total()).toBe(2);
    expect(service.countByPurpose()).toEqual(
      new Map<string, number>([
        ['resolution', 1],
        ['protection', 1],
      ]),
    );
  });
});
