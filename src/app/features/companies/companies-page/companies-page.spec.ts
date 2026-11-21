import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Signal, WritableSignal } from '@angular/core';
import { MigrationService } from '../../../core/services/migration.service';
import { ContactService } from '../../../core/services/contact.service';
import { CompanyService } from '../../../core/services/company.service';
import { I18nService } from '../../../core/services/i18n.service';
import { FullNamePipe } from '../../../core/pipes/full-name.pipe';
import { Company } from '../../../core/models/company.model';
import { CompaniesPage } from './companies-page';

/** Typed accessors for the protected members, following the contact-form spec pattern. */
function formOpenOf(page: CompaniesPage): boolean {
  return (page['formOpen' as keyof CompaniesPage] as Signal<boolean>)();
}

function errorMessageOf(page: CompaniesPage): string | null {
  return (page['errorMessage' as keyof CompaniesPage] as WritableSignal<string | null>)();
}

function pendingDeletionOf(page: CompaniesPage): WritableSignal<Company | null> {
  return page['pendingDeletion' as keyof CompaniesPage] as WritableSignal<Company | null>;
}

describe('CompaniesPage', () => {
  let fixture: ComponentFixture<CompaniesPage>;
  let page: CompaniesPage;
  let companyService: CompanyService;
  let contactService: ContactService;
  let i18n: I18nService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    contactService = TestBed.inject(ContactService);
    companyService = TestBed.inject(CompanyService);
    i18n = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(CompaniesPage);
    page = fixture.componentInstance;
    fixture.autoDetectChanges();
  });

  function cards(): HTMLElement[] {
    return fixture.debugElement
      .queryAll(By.css('.company-card'))
      .map((debug) => debug.nativeElement as HTMLElement);
  }

  function cardByTitle(title: string): HTMLElement | null {
    return (
      cards().find(
        (card) => card.querySelector('h2')?.textContent?.trim() === title,
      ) ?? null
    );
  }

  /** camelCase token mirror of the component's vocabularyKeyToken(). */
  function keyToken(value: string): string {
    return value
      .split(/[\s-]+/)
      .filter((part) => part.length > 0)
      .map((part, index) => {
        const lower = part.toLowerCase();
        return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join('');
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
      By.css('.company-form button[type="submit"]'),
    ).nativeElement as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();
  }

  function openCreateModal(): void {
    page.openCreateModal();
    fixture.detectChanges();
  }

  function openEditModal(company: Company): void {
    page.openEditModal(company);
    fixture.detectChanges();
  }

  it('renders the seeded companies with their size, structure and sector labels', () => {
    const companies = companyService.companies();
    expect(cards().length).toBe(companies.length);
    for (const company of companies) {
      const card = cardByTitle(company.name);
      expect(card).not.toBeNull();
      // The cards render the translated size label via the 't' pipe.
      expect(card?.textContent).toContain(i18n.translate(`sizeHint.${keyToken(company.size)}`));
    }
  });

  it('shows the CEO name when recorded and a muted fallback otherwise', () => {
    const withCeo = companyService.companies().find((c) => c.contactId !== null);
    const withoutCeo = companyService.companies().find((c) => c.contactId === null);
    if (!withCeo || !withoutCeo) {
      return;
    }
    const ceoId = withCeo.contactId;
    const ceo = ceoId === null ? null : contactService.getById(ceoId);
    expect(ceo).not.toBeNull();

    const ceoCard = cardByTitle(withCeo.name);
    expect(ceoCard?.textContent).toContain(new FullNamePipe().transform(ceo?.name ?? null));

    const noneCard = cardByTitle(withoutCeo.name);
    expect(noneCard?.textContent).toContain(i18n.translate('companies.ceoNone'));
    expect(noneCard?.textContent).not.toContain(`${i18n.translate('companies.ceo')}:`);
  });

  it('shows the number of contacts using each company', () => {
    const company = companyService.companies().find((entry) => (companyService.usageByCompany().get(entry.id) ?? 0) > 0);
    if (!company) {
      return;
    }
    const count = companyService.usageByCompany().get(company.id) ?? 0;
    const card = cardByTitle(company.name);
    expect(card?.querySelector('.company-usage')?.textContent).toContain(String(count));
  });

  it('creates a company through the accessible modal form', () => {
    const cta = fixture.debugElement.query(
      By.css('.page-header .btn-primary'),
    ).nativeElement as HTMLButtonElement;
    cta.click();
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(By.css('[role="dialog"]'));
    expect(dialog).not.toBeNull();
    expect(dialog.nativeElement.getAttribute('aria-modal')).toBe('true');
    expect(dialog.nativeElement.getAttribute('aria-labelledby')).toBe('company-dialog-title');

    fillInput('name', 'Acme Aerospace');
    fillInput('businessStructure', 'Corporation');
    fillInput('sector', 'Manufacturing');
    submitForm();

    expect(formOpenOf(page)).toBe(false);
    const created = companyService.companies().find((c) => c.name === 'Acme Aerospace');
    expect(created).toBeDefined();
    expect(created?.businessStructure).toBe('Corporation');
    expect(created?.contactId).toBeNull();
  });

  it('maps an empty CEO selection to null and a chosen contact to its id', () => {
    const contact = contactService.contacts()[0];
    openCreateModal();
    fillInput('name', 'Ceo Linked Co');
    fillInput('contactId', contact.id);
    submitForm();
    expect(companyService.companies().find((c) => c.name === 'Ceo Linked Co')?.contactId)
      .toBe(contact.id);
  });

  it('shows the duplicate error inline and keeps the modal open', () => {
    const taken = companyService.companies()[0].name;
    openCreateModal();
    fillInput('name', taken);
    submitForm();

    expect(formOpenOf(page)).toBe(true);
    const dialog = fixture.debugElement.query(By.css('[role="dialog"]'));
    expect(dialog.nativeElement.textContent).toContain(i18n.translate('companies.duplicate'));
    expect(companyService.total()).toBe(7);
  });

  it('prefills the modal for editing and saves the changes', () => {
    const company = companyService.companies()[0];
    openEditModal(company);
    fixture.detectChanges();

    const nameInput = fixture.debugElement.query(
      By.css('[formControlName="name"]'),
    ).nativeElement as HTMLInputElement;
    expect(nameInput.value).toBe(company.name);

    fillInput('name', 'Novapart Reimagined');
    submitForm();

    expect(companyService.getById(company.id)?.name).toBe('Novapart Reimagined');
    expect(formOpenOf(page)).toBe(false);
  });

  it('blocks the deletion of a company still referenced by contacts', () => {
    const company = companyService
      .companies()
      .find((entry) => (companyService.usageByCompany().get(entry.id) ?? 0) > 0);
    if (!company) {
      return;
    }
    pendingDeletionOf(page).set(company);
    fixture.detectChanges();

    const confirm = fixture.debugElement.query(
      By.css('app-confirm-dialog .btn-danger'),
    ).nativeElement as HTMLButtonElement;
    confirm.click();
    fixture.detectChanges();

    expect(errorMessageOf(page)).toBe(i18n.translate('companies.deleteBlocked'));
    expect(companyService.getById(company.id)).not.toBeNull();
  });

  it('deletes an unreferenced company after confirmation', () => {
    const company =
      companyService
        .companies()
        .find((entry) => !companyService.usageByCompany().get(entry.id)) ?? null;
    if (!company) {
      return;
    }
    const count = companyService.total();
    pendingDeletionOf(page).set(company);
    fixture.detectChanges();

    const confirm = fixture.debugElement.query(
      By.css('app-confirm-dialog .btn-danger'),
    ).nativeElement as HTMLButtonElement;
    confirm.click();
    fixture.detectChanges();

    expect(errorMessageOf(page)).toBeNull();
    expect(companyService.getById(company.id)).toBeNull();
    expect(companyService.total()).toBe(count - 1);
  });

  it('closes the modal on Escape and shows the required error on an empty submit', () => {
    openCreateModal();
    fixture.detectChanges();

    const overlay = fixture.debugElement.query(By.css('.dialog-overlay')).nativeElement;
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(formOpenOf(page)).toBe(false);

    openCreateModal();
    submitForm();
    fixture.detectChanges();

    const error = fixture.debugElement.query(By.css('#company-name-error'));
    expect(error).not.toBeNull();
    expect(error.nativeElement.textContent.trim()).toBe(i18n.translate('form.required'));
  });
});
