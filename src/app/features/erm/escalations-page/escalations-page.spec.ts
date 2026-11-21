import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Signal, WritableSignal } from '@angular/core';
import { MigrationService } from '../../../core/services/migration.service';
import { ContactService } from '../../../core/services/contact.service';
import { EscalationService } from '../../../core/services/escalation.service';
import { CaseService } from '../../../core/services/case.service';
import { I18nService } from '../../../core/services/i18n.service';
import { FullNamePipe } from '../../../core/pipes/full-name.pipe';
import { Escalation } from '../../../core/models/phase2/escalation.model';
import { EscalationsPage } from './escalations-page';

/** Typed accessors for the protected members, like the companies-page spec. */
function formOpenOf(page: EscalationsPage): boolean {
  return (page['formOpen' as keyof EscalationsPage] as Signal<boolean>)();
}

function errorMessageOf(page: EscalationsPage): string | null {
  return (page['errorMessage' as keyof EscalationsPage] as WritableSignal<string | null>)();
}

function pendingDeletionOf(page: EscalationsPage): WritableSignal<Escalation | null> {
  return page['pendingDeletion' as keyof EscalationsPage] as WritableSignal<Escalation | null>;
}

describe('EscalationsPage', () => {
  let fixture: ComponentFixture<EscalationsPage>;
  let page: EscalationsPage;
  let escalationService: EscalationService;
  let contactService: ContactService;
  let caseService: CaseService;
  let i18n: I18nService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    contactService = TestBed.inject(ContactService);
    escalationService = TestBed.inject(EscalationService);
    caseService = TestBed.inject(CaseService);
    i18n = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(EscalationsPage);
    page = fixture.componentInstance;
    fixture.autoDetectChanges();
  });

  function cards(): HTMLElement[] {
    return fixture.debugElement
      .queryAll(By.css('.escalation-card'))
      .map((debug) => debug.nativeElement as HTMLElement);
  }

  /** Display name of a seeded contact, as rendered by FullNamePipe. */
  function nameOf(contactId: string): string {
    const contact = contactService.getById(contactId);
    expect(contact).not.toBeNull();
    return new FullNamePipe().transform(contact?.name ?? null);
  }

  function ladderText(card: HTMLElement): string {
    return card.querySelector('.escalation-ladder')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function fillInput(formControlName: string, value: string): void {
    const input = fixture.debugElement.query(
      By.css(`[formControlName="${formControlName}"]`),
    ).nativeElement as HTMLInputElement;
    input.value = value;
    // Selects only notify through 'change'; text inputs through 'input'.
    const event = input.tagName === 'SELECT' ? new Event('change') : new Event('input');
    input.dispatchEvent(event);
    fixture.detectChanges();
  }

  function submitForm(): void {
    const submit = fixture.debugElement.query(
      By.css('.escalation-form button[type="submit"]'),
    ).nativeElement as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();
  }

  function openCreateModal(): void {
    page.openCreateModal();
    fixture.detectChanges();
  }

  function openEditModal(escalation: Escalation): void {
    page.openEditModal(escalation);
    fixture.detectChanges();
  }

  function twoSeededContactIds(): [string, string] {
    const contacts = contactService.contacts();
    expect(contacts.length).toBeGreaterThanOrEqual(2);
    return [contacts[0].id, contacts[1].id];
  }

  it('renders the seeded escalations with source -> target names and level/purpose badges', () => {
    const escalations = escalationService.escalations();
    expect(escalations.length).toBeGreaterThanOrEqual(2);
    expect(cards().length).toBe(escalations.length);

    for (const escalation of escalations) {
      const card = cards().find((entry) =>
        ladderText(entry).includes(nameOf(escalation.sourceContactId)),
      );
      expect(card).toBeDefined();
      // Ladder: source name -> target name.
      expect(ladderText(card!)).toContain(nameOf(escalation.sourceContactId));
      expect(ladderText(card!)).toContain(nameOf(escalation.targetContactId));
      expect(ladderText(card!)).toContain('→');

      // Missing source/target refs fall back to the FullNamePipe placeholder.
      const arrow = card!.querySelector('.escalation-arrow') as HTMLElement;
      expect(arrow.getAttribute('aria-label')).toBeTruthy();

      const badges = [...card!.querySelectorAll('.escalation-badges .badge')].map(
        (badge) => badge.textContent?.trim() ?? '',
      );
      expect(badges).toContain(i18n.translate(`escalation.level.${escalation.sourceLevel}`));
      expect(badges).toContain(i18n.translate(`escalation.level.${escalation.targetLevel}`));
      expect(badges).toContain(i18n.translate(`escalation.purpose.${escalation.purpose}`));
    }
  });

  it('renders the linked mediation case title and omits the line when unlinked', () => {
    const linked = escalationService.escalations().find((entry) => entry.mediationCaseId !== null);
    const unlinked = escalationService.escalations().find((entry) => entry.mediationCaseId === null);
    // Fallback: create an unlinked step when the seed has none.
    if (!unlinked) {
      const [sourceId, targetId] = twoSeededContactIds();
      openCreateModal();
      fillInput('sourceContactId', sourceId);
      fillInput('targetContactId', targetId);
      submitForm();
    }

    if (linked) {
      const linkedCard = cards().find((entry) =>
        ladderText(entry).includes(nameOf(linked.sourceContactId)),
      );
      expect(linkedCard).toBeDefined();
      const caseTitle =
        caseService.getById(linked.mediationCaseId ?? '')?.title ?? null;
      expect(caseTitle).not.toBeNull();
      expect(linkedCard!.querySelector('.escalation-case')?.textContent).toContain(
        i18n.translate('escalation.mediationCase'),
      );
      expect(linkedCard!.querySelector('.escalation-case')?.textContent).toContain(caseTitle!);
    }

    const unlinkedCards = cards().filter(
      (entry) => !entry.querySelector('.escalation-case'),
    );
    expect(unlinkedCards.length).toBeGreaterThan(0);
    expect(unlinkedCards[0].textContent).not.toContain(
      i18n.translate('escalation.mediationCase'),
    );
  });

  it('creates an escalation through the accessible modal form', () => {
    const cta = fixture.debugElement.query(
      By.css('.page-header .btn-primary'),
    ).nativeElement as HTMLButtonElement;
    cta.click();
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(By.css('[role="dialog"]'));
    expect(dialog).not.toBeNull();
    expect(dialog.nativeElement.getAttribute('aria-modal')).toBe('true');
    expect(dialog.nativeElement.getAttribute('aria-labelledby')).toBe(
      'escalation-dialog-title',
    );

    const [sourceId, targetId] = twoSeededContactIds();
    fillInput('sourceContactId', sourceId);
    fillInput('targetContactId', targetId);
    fillInput('sourceLevel', 'management');
    fillInput('targetLevel', 'legal');
    fillInput('purpose', 'protection');
    fillInput('notes', 'Escalation created from the spec.');
    submitForm();

    expect(formOpenOf(page)).toBe(false);
    const created = escalationService
      .escalations()
      .find((entry) => entry.notes === 'Escalation created from the spec.');
    expect(created).toBeDefined();
    expect(created?.sourceContactId).toBe(sourceId);
    expect(created?.targetContactId).toBe(targetId);
    expect(created?.sourceLevel).toBe('management');
    expect(created?.targetLevel).toBe('legal');
    expect(created?.purpose).toBe('protection');
  });

  it('refuses identical source and target contacts and keeps the modal open', () => {
    const count = escalationService.total();
    const contact = contactService.contacts()[0];
    openCreateModal();
    fillInput('sourceContactId', contact.id);
    fillInput('targetContactId', contact.id);
    submitForm();

    expect(formOpenOf(page)).toBe(true);
    expect(escalationService.total()).toBe(count);
    const dialog = fixture.debugElement.query(By.css('[role="dialog"]'));
    const error = dialog.nativeElement.querySelector('#escalation-target-error');
    expect(error).not.toBeNull();
    expect(error.textContent.trim()).toContain('must differ');
  });

  it('shows the required error on an empty submit and closes on Escape', () => {
    openCreateModal();
    submitForm();

    const error = fixture.debugElement.query(By.css('#escalation-source-error'));
    expect(error).not.toBeNull();
    expect(error.nativeElement.textContent.trim()).toBe(i18n.translate('form.required'));

    const overlay = fixture.debugElement.query(By.css('.dialog-overlay')).nativeElement;
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(formOpenOf(page)).toBe(false);
  });

  it('maps an empty mediation selection to null and a chosen case to its id', () => {
    const [sourceId, targetId] = twoSeededContactIds();
    const caseEntry = caseService.cases()[0];

    openCreateModal();
    fillInput('sourceContactId', sourceId);
    fillInput('targetContactId', targetId);
    submitForm();
    const withoutCase = escalationService
      .escalations()
      .find(
        (entry) =>
          entry.sourceContactId === sourceId &&
          entry.targetContactId === targetId &&
          entry.mediationCaseId === null,
      );
    expect(withoutCase).toBeDefined();

    openCreateModal();
    fillInput('sourceContactId', sourceId);
    fillInput('targetContactId', targetId);
    fillInput('mediationCaseId', caseEntry.id);
    submitForm();
    const withCase = escalationService
      .escalations()
      .find(
        (entry) =>
          entry.sourceContactId === sourceId &&
          entry.targetContactId === targetId &&
          entry.mediationCaseId === caseEntry.id,
      );
    expect(withCase).toBeDefined();
  });

  it('filters by purpose select', () => {
    const seeded = escalationService.escalations();
    const firstPurpose = seeded[0].purpose;
    const otherPurpose = escalationService
      .escalations()
      .find((entry) => entry.purpose !== firstPurpose)?.purpose;
    if (!otherPurpose) {
      return;
    }

    const select = fixture.debugElement.query(
      By.css('#escalation-filter-purpose'),
    ).nativeElement as HTMLSelectElement;
    select.value = firstPurpose;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const visible = cards().length;
    const expected = seeded.filter((entry) => entry.purpose === firstPurpose).length;
    expect(visible).toBe(expected);
    expect(escalationService.total()).toBe(seeded.length);

    // Back to "all".
    select.value = 'all';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(cards().length).toBe(seeded.length);
  });

  it('filters by target level select', () => {
    const seeded = escalationService.escalations();
    const firstLevel = seeded[0].targetLevel;
    const otherLevel = escalationService
      .escalations()
      .find((entry) => entry.targetLevel !== firstLevel)?.targetLevel;
    if (!otherLevel) {
      return;
    }

    const select = fixture.debugElement.query(
      By.css('#escalation-filter-target-level'),
    ).nativeElement as HTMLSelectElement;
    select.value = firstLevel;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const expected = seeded.filter((entry) => entry.targetLevel === firstLevel).length;
    expect(cards().length).toBe(expected);
    expect(cards().length).toBeLessThan(seeded.length);

    select.value = 'all';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(cards().length).toBe(seeded.length);
  });

  it('prefills the modal for editing and saves the changes', () => {
    const escalation = escalationService.escalations()[0];
    openEditModal(escalation);

    const sourceSelect = fixture.debugElement.query(
      By.css('[formControlName="sourceContactId"]'),
    ).nativeElement as HTMLSelectElement;
    expect(sourceSelect.value).toBe(escalation.sourceContactId);

    const targetSelect = fixture.debugElement.query(
      By.css('[formControlName="targetContactId"]'),
    ).nativeElement as HTMLSelectElement;
    expect(targetSelect.value).toBe(escalation.targetContactId);

    fillInput('purpose', 'sanction');
    fillInput('notes', 'Purpose revised after review.');
    submitForm();

    expect(formOpenOf(page)).toBe(false);
    const updated = escalationService.getById(escalation.id);
    expect(updated).not.toBeNull();
    expect(updated?.purpose).toBe('sanction');
    expect(updated?.notes).toBe('Purpose revised after review.');
    expect(updated?.sourceContactId).toBe(escalation.sourceContactId);
    expect(updated?.sourceLevel).toBe(escalation.sourceLevel);
  });

  it('deletes an escalation after confirmation through the confirm dialog', () => {
    const escalation = escalationService.escalations()[0];
    const count = escalationService.total();
    pendingDeletionOf(page).set(escalation);
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(
      By.css('app-confirm-dialog [role="alertdialog"]'),
    );
    expect(dialog).not.toBeNull();
    expect(dialog.nativeElement.textContent).toContain(
      i18n.translate('confirm.deleteEscalationTitle'),
    );

    const confirm = fixture.debugElement.query(
      By.css('app-confirm-dialog .btn-danger'),
    ).nativeElement as HTMLButtonElement;
    confirm.click();
    fixture.detectChanges();

    expect(errorMessageOf(page)).toBeNull();
    expect(escalationService.getById(escalation.id)).toBeNull();
    expect(escalationService.total()).toBe(count - 1);
  });

  it('cancelling the confirm dialog keeps the escalation', () => {
    const escalation = escalationService.escalations()[0];
    const count = escalationService.total();
    pendingDeletionOf(page).set(escalation);
    fixture.detectChanges();

    const cancel = fixture.debugElement.query(
      By.css('app-confirm-dialog .btn-ghost'),
    ).nativeElement as HTMLButtonElement;
    cancel.click();
    fixture.detectChanges();

    expect(escalationService.total()).toBe(count);
    expect(escalationService.getById(escalation.id)).not.toBeNull();
  });
});
