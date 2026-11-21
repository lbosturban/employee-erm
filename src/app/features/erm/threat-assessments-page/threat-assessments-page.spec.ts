import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Signal, WritableSignal } from '@angular/core';
import { MigrationService } from '../../../core/services/migration.service';
import { ContactService } from '../../../core/services/contact.service';
import { ThreatAssessmentService } from '../../../core/services/threat-assessment.service';
import { I18nService } from '../../../core/services/i18n.service';
import { FullNamePipe } from '../../../core/pipes/full-name.pipe';
import {
  ThreatAssessment,
} from '../../../core/models/phase2/threat-assessment.model';
import { ThreatAssessmentsPage } from './threat-assessments-page';

/** Typed accessors for the protected members, following companies-page.spec. */
function formOpenOf(page: ThreatAssessmentsPage): boolean {
  return (page['formOpen' as keyof ThreatAssessmentsPage] as Signal<boolean>)();
}

function filterLevelOf(page: ThreatAssessmentsPage): WritableSignal<string> {
  return page['filterLevel' as keyof ThreatAssessmentsPage] as WritableSignal<string>;
}

function pendingDeletionOf(
  page: ThreatAssessmentsPage,
): WritableSignal<ThreatAssessment | null> {
  return page['pendingDeletion' as keyof ThreatAssessmentsPage] as WritableSignal<
    ThreatAssessment | null
  >;
}

describe('ThreatAssessmentsPage', () => {
  let fixture: ComponentFixture<ThreatAssessmentsPage>;
  let page: ThreatAssessmentsPage;
  let threatAssessmentService: ThreatAssessmentService;
  let contactService: ContactService;
  let i18n: I18nService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    contactService = TestBed.inject(ContactService);
    threatAssessmentService = TestBed.inject(ThreatAssessmentService);
    i18n = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(ThreatAssessmentsPage);
    page = fixture.componentInstance;
    fixture.autoDetectChanges();
  });

  function cards(): HTMLElement[] {
    return fixture.debugElement
      .queryAll(By.css('.threat-card'))
      .map((debug) => debug.nativeElement as HTMLElement);
  }

  /** First card (the service prepends creations, the seed has only one). */
  function firstCard(): HTMLElement {
    const card = cards()[0];
    expect(card).toBeDefined();
    return card;
  }

  /** Expands the details block of the first card through its toggle button. */
  function expandFirstCard(): HTMLElement {
    const card = firstCard();
    const toggle = card.querySelector('.threat-actions .btn-ghost') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    return card.querySelector('.threat-details') as HTMLElement;
  }

  function fillFormControl(formControlName: string, value: string): void {
    const element = fixture.debugElement.query(
      By.css(`[formControlName="${formControlName}"]`),
    ).nativeElement as HTMLInputElement | HTMLTextAreaElement;
    element.value = value;
    // Selects only notify through 'change'; text areas through 'input'.
    const event =
      element.tagName === 'SELECT' ? new Event('change') : new Event('input');
    element.dispatchEvent(event);
    fixture.detectChanges();
  }

  function submitForm(): void {
    const submit = fixture.debugElement.query(
      By.css('.threat-form button[type="submit"]'),
    ).nativeElement as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();
  }

  it('renders the seeded assessment with the subject, company and overall level badge', () => {
    const seeded = threatAssessmentService.assessments()[0];
    expect(seeded).toBeDefined();
    const contact = contactService.getById(seeded.contactId);
    expect(contact).not.toBeNull();
    expect(new FullNamePipe().transform(contact?.name ?? null)).toBeTruthy();

    const card = firstCard();
    expect(cards().length).toBe(threatAssessmentService.total());
    expect(card.textContent).toContain(
      new FullNamePipe().transform(contact?.name ?? null),
    );
    if (seeded.companyId !== null) {
      expect(card.textContent).toContain(
        i18n.translate('form.companyId'),
      );
    }
    expect(card.textContent).toContain(
      i18n.translate(`threat.level.${seeded.overallThreat}`),
    );
    expect(card.querySelector('.badge:not(.badge-muted)')?.textContent?.trim())
      .toBe(i18n.translate(`threat.level.${seeded.overallThreat}`));
  });

  it('shows all 10 localized DCJS section titles with severity badges once expanded', () => {
    const details = expandFirstCard();
    for (const key of [
      'identity',
      'motives',
      'grievance',
      'targeting',
      'capability',
      'breach-attempts',
      'direct-leakage',
      'risk-attitude',
      'mitigation',
      'final-classification',
    ]) {
      expect(details.textContent).toContain(i18n.translate(`threat.section.${key}`));
    }
    const rows = details.querySelectorAll('.threat-section-row');
    expect(rows.length).toBe(10);
    const seeded = threatAssessmentService.assessments()[0];
    rows.forEach((row, index) => {
      expect(row.textContent).toContain(
        i18n.translate(`severity.${seeded.sections[index].severity}`),
      );
      expect(row.textContent).toContain(seeded.sections[index].findings.trim());
    });
  });

  it('displays a progress equal to the number of non-empty findings', () => {
    const seeded = threatAssessmentService.assessments()[0];
    const expected = seeded.sections.filter((entry) => entry.findings.trim() !== '')
      .length;
    const card = firstCard();
    expect(card.textContent).toContain(`${expected}/10`);
    expect(card.textContent).toContain(i18n.translate('threat.sectionsProgress'));
  });

  it('creates an assessment through the modal with subject, company and level', () => {
    const before = threatAssessmentService.total();
    const cta = fixture.debugElement.query(
      By.css('.page-header .btn-primary'),
    ).nativeElement as HTMLButtonElement;
    cta.click();
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(By.css('[role="dialog"]'));
    expect(dialog).not.toBeNull();
    expect(dialog.nativeElement.getAttribute('aria-modal')).toBe('true');

    const contact = contactService.contacts()[0];
    fillFormControl('contactId', contact.id);
    const seeded = threatAssessmentService.assessments()[0];
    fillFormControl('companyId', seeded.companyId ?? '');
    fillFormControl('overallThreat', 'major');
    const findingsAreas = fixture.debugElement.queryAll(
      By.css('[formControlName="findings"]'),
    );
    expect(findingsAreas.length).toBe(10);
    findingsAreas[0].nativeElement.value = 'Refused badge access twice.';
    findingsAreas[0].nativeElement.dispatchEvent(new Event('input'));
    findingsAreas[1].nativeElement.value = 'Mentioned "payback" in an email.';
    findingsAreas[1].nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    submitForm();

    expect(formOpenOf(page)).toBe(false);
    expect(threatAssessmentService.total()).toBe(before + 1);
    const created = threatAssessmentService.assessments()[0];
    expect(created.contactId).toBe(contact.id);
    expect(created.companyId).toBe(seeded.companyId);
    expect(created.overallThreat).toBe('major');
    expect(created.sections).toHaveLength(10);
    expect(created.sections[0]).toEqual({
      section: 'identity',
      findings: 'Refused badge access twice.',
      severity: 'unknown',
    });
    // Sections left untouched stay empty with the default severity.
    expect(created.sections[2]).toEqual({
      section: 'grievance',
      findings: '',
      severity: 'unknown',
    });
    // The required subject blocks an empty submit.
    cta.click();
    fixture.detectChanges();
    submitForm();
    expect(formOpenOf(page)).toBe(true);
    expect(
      fixture.debugElement.query(By.css('#threat-contact-error')),
    ).not.toBeNull();
  });

  it('prefills the modal when editing and saves a new overall level', () => {
    const seeded = threatAssessmentService.assessments()[0];
    page.openEditModal(seeded);
    fixture.detectChanges();

    const subject = fixture.debugElement.query(
      By.css('[formControlName="contactId"]'),
    ).nativeElement as HTMLSelectElement;
    expect(subject.value).toBe(seeded.contactId);
    if (seeded.companyId !== null) {
      const company = fixture.debugElement.query(
        By.css('[formControlName="companyId"]'),
      ).nativeElement as HTMLSelectElement;
      expect(company.value).toBe(seeded.companyId);
    }

    fillFormControl('overallThreat', 'major');
    submitForm();

    const updated = threatAssessmentService.getById(seeded.id);
    expect(updated?.overallThreat).toBe('major');
    // Findings are trimmed on save; the seeded last section has a leading
    // space, so compare against the normalized forms.
    expect(updated?.sections).toEqual(
      seeded.sections.map((entry) => ({
        ...entry,
        findings: entry.findings.trim(),
      })),
    );
    expect(updated?.createdAt).toBe(seeded.createdAt);
    expect(formOpenOf(page)).toBe(false);
  });

  it('filters the cards by overall threat level', () => {
    const contact = contactService.contacts()[0];
    threatAssessmentService.create({
      contactId: contact.id,
      companyId: null,
      sections: [
        {
          section: 'identity',
          findings: 'Escalating email incidents.',
          severity: 'high',
        },
      ],
      overallThreat: 'imminent',
    });
    fixture.detectChanges();
    expect(cards().length).toBe(2);

    const filter = fixture.debugElement.query(
      By.css('#threat-filter'),
    ).nativeElement as HTMLSelectElement;
    filter.value = 'imminent';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(filterLevelOf(page)()).toBe('imminent');
    expect(cards().length).toBe(1);
    expect(cards()[0].textContent).toContain(
      i18n.translate('threat.level.imminent'),
    );

    filter.value = 'major';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(cards().length).toBe(0);
    expect(fixture.debugElement.nativeElement.textContent).toContain(
      i18n.translate('erm.emptyThreats'),
    );

    filter.value = 'all';
    filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(cards().length).toBe(2);
  });

  it('deletes an assessment through the confirmation dialog', () => {
    const seeded = threatAssessmentService.assessments()[0];
    const before = threatAssessmentService.total();

    pendingDeletionOf(page).set(seeded);
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(By.css('app-confirm-dialog'));
    expect(dialog).not.toBeNull();
    expect(dialog.nativeElement.textContent).toContain(
      i18n.translate('confirm.deleteThreatTitle'),
    );
    expect(dialog.nativeElement.textContent).toContain(
      i18n.translate('confirm.deleteThreatMessage'),
    );

    (
      fixture.debugElement.query(By.css('app-confirm-dialog .btn-danger'))
        .nativeElement as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(pendingDeletionOf(page)()).toBeNull();
    expect(threatAssessmentService.getById(seeded.id)).toBeNull();
    expect(threatAssessmentService.total()).toBe(before - 1);
    expect(fixture.debugElement.nativeElement.textContent).toContain(
      i18n.translate('erm.emptyThreats'),
    );
  });

  it('closes the modal on Escape', () => {
    page.openCreateModal();
    fixture.detectChanges();

    const overlay = fixture.debugElement.query(By.css('.dialog-overlay')).nativeElement;
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(formOpenOf(page)).toBe(false);
  });
});
