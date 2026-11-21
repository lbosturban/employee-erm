import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Signal, WritableSignal } from '@angular/core';
import { MigrationService } from '../../../core/services/migration.service';
import { ContactService } from '../../../core/services/contact.service';
import { CompanyService } from '../../../core/services/company.service';
import { LegalElementsService } from '../../../core/services/legal-elements.service';
import { I18nService } from '../../../core/services/i18n.service';
import { FullNamePipe } from '../../../core/pipes/full-name.pipe';
import { LegalElementReference } from '../../../core/models/phase2/legal-elements.model';
import { LegalElementsPage } from './legal-elements-page';

/** Typed accessors for the protected members, following the companies-page spec pattern. */
function formOpenOf(page: LegalElementsPage): boolean {
  return (page['formOpen' as keyof LegalElementsPage] as Signal<boolean>)();
}

function referenceFormBundleIdOf(page: LegalElementsPage): WritableSignal<string | null> {
  return page['referenceFormBundleId' as keyof LegalElementsPage] as WritableSignal<string | null>;
}

describe('LegalElementsPage', () => {
  let fixture: ComponentFixture<LegalElementsPage>;
  let page: LegalElementsPage;
  let legalService: LegalElementsService;
  let contactService: ContactService;
  let companyService: CompanyService;
  let i18n: I18nService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    contactService = TestBed.inject(ContactService);
    companyService = TestBed.inject(CompanyService);
    legalService = TestBed.inject(LegalElementsService);
    i18n = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(LegalElementsPage);
    page = fixture.componentInstance;
    fixture.autoDetectChanges();
  });

  function bundleCards(): HTMLElement[] {
    return fixture.debugElement
      .queryAll(By.css('.bundle-card'))
      .map((debug) => debug.nativeElement as HTMLElement);
  }

  /** First (seeded) bundle card. */
  function seededCard(): HTMLElement {
    const card = bundleCards()[0];
    expect(card).toBeDefined();
    return card;
  }

  /** Section blocks of a card, keyed by their translated heading. */
  function sectionByTitle(card: HTMLElement, title: string): HTMLElement | null {
    const headings = Array.from(
      card.querySelectorAll<HTMLElement>('.legal-section'),
    );
    return headings.find((section) => section.querySelector('h3')?.textContent?.trim() === title) ?? null;
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

  it('renders the seeded bundle grouped into the four fixed sections', () => {
    const bundles = legalService.bundles();
    expect(bundles.length).toBeGreaterThan(0);
    expect(bundleCards().length).toBe(bundles.length);

    const card = seededCard();
    const contact = contactService.getById(bundles[0].contactId);
    expect(card.textContent).toContain(new FullNamePipe().transform(contact?.name ?? null));

    const sectionKeys = [
      'legal.section.contracts',
      'legal.section.legal-work-code',
      'legal.section.internal-structural-elements',
      'legal.section.further-legal-documentation',
    ];
    for (const key of sectionKeys) {
      expect(card.textContent).toContain(i18n.translate(key));
    }

    // Every seeded reference appears under its own section heading.
    for (const reference of bundles[0].references) {
      const section = sectionByTitle(card, i18n.translate(`legal.section.${reference.kind}`));
      expect(section).not.toBeNull();
      expect(section?.textContent).toContain(reference.label);
    }

    // Sections with at least one reference do not show the muted empty line.
    const filled = sectionByTitle(card, i18n.translate('legal.section.contracts'));
    expect(filled?.querySelector('.reference-empty')).toBeNull();
  });

  it('renders an external URL as a safe anchor and the company name when set', () => {
    const card = seededCard();
    const external = legalService
      .bundles()[0]
      .references.find((reference) => reference.externalUrl !== null);
    expect(external).toBeDefined();

    const link = card.querySelector<HTMLAnchorElement>('a.reference-link');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe(external?.externalUrl);
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');

    const bundle = legalService.bundles()[0];
    if (bundle.companyId !== null) {
      expect(card.textContent).toContain(companyService.getById(bundle.companyId)?.name ?? '');
    }
    // References without a URL render no anchor.
    const withoutUrl: LegalElementReference | undefined = legalService
      .bundles()[0]
      .references.find((reference) => reference.externalUrl === null);
    if (withoutUrl) {
      const section = sectionByTitle(card, i18n.translate(`legal.section.${withoutUrl.kind}`));
      expect(section?.querySelector('a.reference-link')).toBeNull();
    }
  });

  it('adds a reference through the inline form', () => {
    const bundle = legalService.bundles()[0];
    const before = bundle.references.length;

    // Open the inline form of the first card and submit it empty: blocked.
    const addButton = seededCard().querySelector<HTMLButtonElement>('.bundle-actions .btn-ghost');
    addButton?.click();
    fixture.detectChanges();
    expect(referenceFormBundleIdOf(page)()).toBe(bundle.id);

    const submit = fixture.debugElement.query(
      By.css('.reference-form button[type="submit"]'),
    ).nativeElement as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();
    expect(legalService.getById(bundle.id)?.references.length).toBe(before);
    expect(fixture.debugElement.query(By.css('.form-error'))).not.toBeNull();

    // Fill the (optional-URL) draft and submit: the reference lands in the bundle.
    fillInput('kind', 'further-legal-documentation');
    fillInput('label', 'Pricing grid reference');
    fillInput('location', 'Shared drive / Legal / Pricing 2026');
    fillInput('externalUrl', 'https://example.com/pricing');
    submit.click();
    fixture.detectChanges();

    expect(referenceFormBundleIdOf(page)()).toBeNull();
    const after = legalService.getById(bundle.id)?.references ?? [];
    expect(after.length).toBe(before + 1);
    const added = after.find((reference) => reference.label === 'Pricing grid reference');
    expect(added?.kind).toBe('further-legal-documentation');
    expect(added?.location).toBe('Shared drive / Legal / Pricing 2026');
    expect(added?.externalUrl).toBe('https://example.com/pricing');

    const card = seededCard();
    expect(card.textContent).toContain('Pricing grid reference');
    const section = sectionByTitle(
      card,
      i18n.translate('legal.section.further-legal-documentation'),
    );
    expect(section?.textContent).toContain('Pricing grid reference');
  });

  it('removes a reference with a single click on its remove button', () => {
    const bundle = legalService.bundles()[0];
    const victim = bundle.references[0];
    const before = bundle.references.length;

    const removeButton = seededCard().querySelector<HTMLButtonElement>('.reference-remove');
    expect(removeButton).not.toBeNull();
    expect(removeButton?.getAttribute('aria-label')).toBeTruthy();
    removeButton?.click();
    fixture.detectChanges();

    const after = legalService.getById(bundle.id)?.references ?? [];
    expect(after.length).toBe(before - 1);
    expect(after.some((reference) => reference.id === victim.id)).toBe(false);

    const card = seededCard();
    expect(card.textContent).not.toContain(victim.label);
    const section = sectionByTitle(card, i18n.translate(`legal.section.${victim.kind}`));
    expect(section?.querySelectorAll('.reference-item').length).toBe(0);
  });

  it('creates a bundle through the accessible modal form', () => {
    const count = legalService.bundles().length;
    const contact = contactService.contacts()[0];

    const cta = fixture.debugElement.query(
      By.css('.page-header .btn-primary'),
    ).nativeElement as HTMLButtonElement;
    cta.click();
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(By.css('[role="dialog"]'));
    expect(dialog).not.toBeNull();
    expect(dialog.nativeElement.getAttribute('aria-modal')).toBe('true');
    expect(dialog.nativeElement.getAttribute('aria-labelledby')).toBe('bundle-dialog-title');

    // Empty submit is blocked by the required contact select.
    const submit = fixture.debugElement.query(
      By.css('.bundle-form button[type="submit"]'),
    ).nativeElement as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();
    expect(formOpenOf(page)).toBe(true);
    expect(fixture.debugElement.query(By.css('#bundle-contact-error'))).not.toBeNull();

    fillInput('contactId', contact.id);
    fillInput('companyId', '');
    submit.click();
    fixture.detectChanges();

    expect(formOpenOf(page)).toBe(false);
    const created = legalService.bundles().find((entry) => entry.contactId === contact.id);
    expect(created).toBeDefined();
    expect(legalService.bundles().length).toBe(count + 1);
    expect(created?.companyId).toBeNull();
    expect(created?.references).toEqual([]);

    // A brand-new bundle shows one muted empty line per section (4 sections).
    const card = bundleCards().find(
      (candidate) => !candidate.querySelector('.reference-item'),
    );
    expect(card).toBeDefined();
    expect(card?.querySelectorAll('.reference-empty').length).toBe(4);
  });

  it('links an optional company to a bundle created through the modal', () => {
    const contact = contactService.contacts()[0];
    const company = companyService.companies()[0];
    page.openCreateModal();
    fixture.detectChanges();
    fillInput('contactId', contact.id);
    fillInput('companyId', company.id);

    const submit = fixture.debugElement.query(
      By.css('.bundle-form button[type="submit"]'),
    ).nativeElement as HTMLButtonElement;
    submit.click();
    fixture.detectChanges();

    const created = legalService
      .bundles()
      .find((entry) => entry.contactId === contact.id && entry.companyId === company.id);
    expect(created).toBeDefined();
    const card = bundleCards().at(-1);
    expect(card?.textContent).toContain(company.name);
  });

  it('deletes a whole bundle after confirmation and cancels otherwise', () => {
    const bundle = legalService.bundles()[0];
    const count = legalService.bundles().length;

    const deleteButton = seededCard().querySelector<HTMLButtonElement>(
      '.bundle-actions .btn-danger',
    );
    deleteButton?.click();
    fixture.detectChanges();

    const dialog = fixture.debugElement.query(By.css('app-confirm-dialog'));
    expect(dialog).not.toBeNull();
    expect(dialog.nativeElement.textContent).toContain(
      i18n.translate('confirm.deleteBundleTitle'),
    );

    // Cancel first: the bundle survives.
    const cancel = fixture.debugElement.query(
      By.css('app-confirm-dialog .btn-ghost'),
    ).nativeElement as HTMLButtonElement;
    cancel.click();
    fixture.detectChanges();
    expect(legalService.getById(bundle.id)).not.toBeNull();

    // Confirm: the bundle (and all its references) is removed.
    deleteButton?.click();
    fixture.detectChanges();
    const confirm = fixture.debugElement.query(
      By.css('app-confirm-dialog .btn-danger'),
    ).nativeElement as HTMLButtonElement;
    confirm.click();
    fixture.detectChanges();

    expect(legalService.getById(bundle.id)).toBeNull();
    expect(legalService.bundles().length).toBe(count - 1);
  });

  it('opens and closes the modal on Escape and shows the empty state without bundles', () => {
    page.openCreateModal();
    fixture.detectChanges();
    const overlay = fixture.debugElement.query(By.css('.dialog-overlay')).nativeElement;
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(formOpenOf(page)).toBe(false);

    for (const bundle of legalService.bundles()) {
      legalService.remove(bundle.id);
    }
    fixture.detectChanges();

    expect(bundleCards().length).toBe(0);
    const empty = fixture.debugElement.query(By.css('.empty-state'));
    expect(empty).not.toBeNull();
    expect(empty.nativeElement.textContent).toContain(i18n.translate('erm.emptyLegal'));
  });
});
