import { TestBed } from '@angular/core/testing';
import { ThreatAssessmentService } from './threat-assessment.service';
import { MigrationService } from './migration.service';
import { THREAT_SECTIONS, ThreatSectionEntry } from '../models/phase2/threat-assessment.model';

describe('ThreatAssessmentService', () => {
  let service: ThreatAssessmentService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    service = TestBed.inject(ThreatAssessmentService);
  });

  it('creates an assessment carrying every one of the 10 DCJS sections', () => {
    const before = service.assessments().length;
    const sections: ThreatSectionEntry[] = THREAT_SECTIONS.map((section) => ({
      section,
      findings: `Findings for ${section}.`,
      severity: 'low' as const,
    }));
    const created = service.create({
      contactId: 'contact-a',
      companyId: null,
      sections,
      overallThreat: 'moderate',
    });

    expect(created).not.toBeNull();
    expect(created.id).not.toBe('');
    expect(typeof created.createdAt).toBe('string');
    expect(created.sections).toHaveLength(10);
    expect(created.sections.map((entry) => entry.section)).toEqual([...THREAT_SECTIONS]);
    // New assessment is prepended; total reflects seed + creation.
    expect(service.assessments().length).toBe(before + 1);
    expect(service.assessments()[0].id).toBe(created.id);
  });

  it('assessmentsForContact returns only the assessments of that subject', () => {
    const subjectContactId = service.assessments()[0].contactId;
    const result = service.assessmentsForContact(subjectContactId);
    expect(result).toHaveLength(1);
    expect(result[0].contactId).toBe(subjectContactId);
    for (const entry of service.assessments()) {
      if (entry.contactId !== subjectContactId) {
        expect(result.some((match) => match.id === entry.id)).toBe(false);
      }
    }
    expect(service.assessmentsForContact('contact-never-seeded')).toEqual([]);
  });

  it('update changes overallThreat while keeping createdAt', () => {
    const seeded = service.assessments()[0];
    const updated = service.update(seeded.id, { overallThreat: 'major' });

    expect(updated).not.toBeNull();
    expect(updated?.overallThreat).toBe('major');
    expect(updated?.createdAt).toBe(seeded.createdAt);
    expect(updated?.id).toBe(seeded.id);
    // Unknown ids never throw and always resolve to null.
    expect(service.update('does-not-exist', { overallThreat: 'major' })).toBeNull();
  });

  it('removes an assessment and rejects an unknown id', () => {
    const victim = service.assessments()[0].id;
    expect(service.remove(victim)).toBe(true);
    expect(service.getById(victim)).toBeNull();
    expect(service.total()).toBe(0);
    expect(service.remove(victim)).toBe(false);
    expect(service.remove('never-existed')).toBe(false);
  });

  it('countByThreatLevel matches the seeded assessment', () => {
    expect(service.total()).toBe(1);
    expect(service.countByThreatLevel()).toEqual(new Map<string, number>([['minor', 1]]));
    expect(service.countByThreatLevel().get('minor')).toBe(1);
  });
});
