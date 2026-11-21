import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Signal, WritableSignal } from '@angular/core';
import { MigrationService } from '../../../core/services/migration.service';
import { CaseService } from '../../../core/services/case.service';
import { CompanyService } from '../../../core/services/company.service';
import { ContactService } from '../../../core/services/contact.service';
import { I18nService } from '../../../core/services/i18n.service';
import { FullNamePipe } from '../../../core/pipes/full-name.pipe';
import { CrmCase } from '../../../core/models/phase2/case.model';
import { CasesPage } from './cases-page';

/** Typed accessors for the protected members, following the companies-page spec pattern. */
function formOpenOf(page: CasesPage): boolean {
  return (page['formOpen' as keyof CasesPage] as Signal<boolean>)();
}

function pendingDeletionOf(page: CasesPage): WritableSignal<CrmCase | null> {
  return page['pendingDeletion' as keyof CasesPage] as WritableSignal<CrmCase | null>;
}

describe('CasesPage', () => {
  let fixture: ComponentFixture<CasesPage>;
  let page: CasesPage;
  let caseService: CaseService;
  let companyService: CompanyService;
  let contactService: ContactService;
  let i18n: I18nService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    caseService = TestBed.inject(CaseService);
    companyService = TestBed.inject(CompanyService);
    contactService = TestBed.inject(ContactService);
    i18n = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(CasesPage);
    page = fixture.componentInstance;
    fixture.autoDetectChanges();
  });

  function cards(): HTMLElement[] {
    return fixture.debugElement
      .queryAll(By.css('.case-card'))
      .map((debug) => debug.nativeElement as HTMLElement);
  }

  function cardByTitle(title: string): HTMLElement | null {
    return cards().find((card) => card.querySelector('h2')?.textContent?.trim() === title) ?? null;
  }

  function openCreateModal(): void {
    page.openCreateModal();
    fixture.detectChanges();
  }

  function openEditModal(caseItem: CrmCase): void {
    page.openEditModal(caseItem);
    fixture.detectChanges();
  }

  /** Sets the value of any text input, textarea or select bound to the form. */
  function fillInput(formControlName: string, value: string): void {
    const input = fixture.debugElement.query(
      By.css(`[formControlName="${formControlName}"]`),
    ).nativeElement as HTMLInputElement;
    input.value = value;
    // Selects only notify through 'change'; text inputs and textareas through 'input'.
    const event = input.tagName === 'SELECT' ? new Event('change') : new Event('input');
    input.dispatchEvent(event);
    fixture.detectChanges();
  }

  function submitForm(): void {
    const submit = fixture.debugElement.query(
      By.css('.case-form button[type="submit"]'),
    ).nativeElement as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();
  }

  function contactCheckboxes(): HTMLInputElement[] {
    return fixture.debugElement
      .queryAll(By.css('[formArrayName="contactIds"] input[type="checkbox"]'))
      .map((debug) => debug.nativeElement as HTMLInputElement);
  }

  it('renders the seeded cases with their kind and status labels', () => {
    const cases = caseService.cases();
    expect(cases.length).toBe(4);
    expect(cards().length).toBe(cases.length);
    for (const caseItem of cases) {
      const card = cardByTitle(caseItem.title);
      expect(card).not.toBeNull();
      expect(card?.textContent).toContain(i18n.translate(`case.kind.${caseItem.kind}`));
      expect(card?.textContent).toContain(i18n.translate(`case.status.${caseItem.status}`));
    }
  });

  it('shows the concerned contact names and the company name', () => {
    const linked = caseService.cases()[0];
    const card = cardByTitle(linked.title);
    expect(card).not.toBeNull();
    for (const contactId of linked.contactIds) {
      const contact = contactService.getById(contactId);
      expect(contact).not.toBeNull();
      expect(card?.textContent).toContain(new FullNamePipe().transform(contact?.name ?? null));
    }
    if (linked.companyId !== null) {
      expect(card?.textContent).toContain(companyService.getById(linked.companyId)?.name ?? '');
    }
  });

  it('filters by kind and by lifecycle status, combined with "all"', () => {
    // Filter by kind: only the complaint case remains.
    const kindSelect = fixture.debugElement.query(
      By.css('#filter-kind'),
    ).nativeElement as HTMLSelectElement;
    kindSelect.value = 'complaint';
    kindSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(cards().length).toBe(1);
    expect(cardByTitle(caseService.cases()[2].title)).not.toBeNull();

    // Combined: an impossible pair shows the empty state.
    const statusSelect = fixture.debugElement.query(
      By.css('#filter-status'),
    ).nativeElement as HTMLSelectElement;
    statusSelect.value = 'resolved';
    statusSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(cards().length).toBe(0);
    expect(fixture.debugElement.query(By.css('.empty-state'))).not.toBeNull();

    // Back to "all" on both filters restores every case.
    kindSelect.value = 'all';
    kindSelect.dispatchEvent(new Event('change'));
    statusSelect.value = 'all';
    statusSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(cards().length).toBe(caseService.cases().length);
  });

  it('creates a case through the accessible modal form', () => {
    const cta = fixture.debugElement.query(
      By.css('.page-header .btn-primary'),
    ).nativeElement as HTMLButtonElement;
    cta.click();
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(By.css('[role="dialog"]'));
    expect(dialog).not.toBeNull();
    expect(dialog.nativeElement.getAttribute('aria-modal')).toBe('true');
    expect(dialog.nativeElement.getAttribute('aria-labelledby')).toBe('case-dialog-title');

    fillInput('title', 'Noise complaints near the open space');
    fillInput('kind', 'mediation');
    fillInput('status', 'observed');
    fillInput('description', 'Neighbors flagged repeated noise during focus hours.');
    const company = companyService.companies()[0];
    fillInput('companyId', company.id);
    const checkboxes = contactCheckboxes();
    checkboxes[0].click();
    checkboxes[1].click();
    fixture.detectChanges();

    submitForm();

    expect(formOpenOf(page)).toBe(false);
    const created = caseService.cases().find((c) => c.title === 'Noise complaints near the open space');
    expect(created).toBeDefined();
    expect(created?.kind).toBe('mediation');
    expect(created?.status).toBe('observed');
    expect(created?.companyId).toBe(company.id);
    expect(created?.contactIds).toHaveLength(2);
  });

  it('blocks the submit and shows an error when no contact is concerned', () => {
    const before = caseService.total();
    openCreateModal();

    fillInput('title', 'No contact attached');
    submitForm();
    fixture.detectChanges();

    expect(formOpenOf(page)).toBe(true);
    const error = fixture.debugElement.query(By.css('#case-contacts-error'));
    expect(error).not.toBeNull();
    expect(error.nativeElement.textContent.trim()).toBe(i18n.translate('form.required'));
    expect(caseService.total()).toBe(before);
  });

  it('shows the title required error on an empty submit', () => {
    openCreateModal();
    submitForm();
    fixture.detectChanges();

    const error = fixture.debugElement.query(By.css('#case-title-error'));
    expect(error).not.toBeNull();
    expect(error.nativeElement.textContent.trim()).toBe(i18n.translate('form.required'));
  });

  it('prefills the modal for editing and saves the changes', () => {
    const caseItem = caseService.cases()[1];
    openEditModal(caseItem);

    const titleInput = fixture.debugElement.query(
      By.css('[formControlName="title"]'),
    ).nativeElement as HTMLInputElement;
    expect(titleInput.value).toBe(caseItem.title);

    // Concerned contacts start checked in edit mode.
    const checkboxes = contactCheckboxes();
    const checkedCount = checkboxes.filter((box) => box.checked).length;
    expect(checkedCount).toBe(caseItem.contactIds.length);

    fillInput('title', 'Authorship conflict merged with HR review');
    fillInput('status', 'resolved');
    submitForm();

    const updated = caseService.getById(caseItem.id);
    expect(updated?.title).toBe('Authorship conflict merged with HR review');
    expect(updated?.status).toBe('resolved');
    // Rebuilt contactIds hold the same contacts (order follows the contact list).
    expect([...(updated?.contactIds ?? [])].sort()).toEqual(
      [...caseItem.contactIds].sort(),
    );
    expect(formOpenOf(page)).toBe(false);
  });

  it('deletes a case after confirmation through the shared dialog', () => {
    const caseItem = caseService.cases()[0];
    const before = caseService.total();
    pendingDeletionOf(page).set(caseItem);
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(By.css('app-confirm-dialog [role="alertdialog"]'));
    expect(dialog).not.toBeNull();
    expect(dialog.nativeElement.textContent).toContain(i18n.translate('confirm.deleteCaseTitle'));

    const confirm = fixture.debugElement.query(
      By.css('app-confirm-dialog .btn-danger'),
    ).nativeElement as HTMLButtonElement;
    confirm.click();
    fixture.detectChanges();

    expect(caseService.getById(caseItem.id)).toBeNull();
    expect(caseService.total()).toBe(before - 1);
  });

  it('renders a dangling contact id as an unknown contact', () => {
    const created = caseService.create({
      kind: 'irritant',
      title: 'Dangling contact reference',
      description: 'The contact row was deleted elsewhere.',
      contactIds: ['ghost-contact-id'],
      companyId: null,
      status: 'open',
    });
    fixture.detectChanges();

    const card = cardByTitle(created.title);
    expect(card).not.toBeNull();
    expect(card?.querySelector('.case-contact-unknown')?.textContent?.trim()).toBe(
      '(unknown contact)',
    );
  });
});
