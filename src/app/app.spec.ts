import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { MigrationService } from './core/services/migration.service';

describe('App', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
    TestBed.inject(MigrationService).run();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the brand title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-text')?.textContent).toContain('Contacts ERM');
  });

  it('renders the five header tool buttons', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = [...compiled.querySelectorAll('.header-tools > .icon-btn')];
    // vCard import, JSON export, JSON import, language, theme.
    expect(buttons.length).toBe(5);
    const labels = buttons.map((button) => button.textContent ?? '');
    expect(labels[0]).toContain('📥');
    expect(labels[1]).toContain('Export JSON');
    expect(labels[2]).toContain('Import JSON');
    expect(labels[3]).toMatch(/FR|EN/);
  });

  it('drives the hidden vCard file input from the labeled import button', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const importButton = compiled.querySelector<HTMLButtonElement>('.header-tools > .icon-btn')!;
    let opened = false;
    const hiddenInput = compiled.querySelector<HTMLInputElement>('.visually-hidden-input')!;
    hiddenInput.click = () => {
      opened = true;
      return;
    };
    importButton.click();
    expect(opened).toBe(true);
  });

  it('shows quick-search matches and navigates to the picked contact', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    await fixture.whenStable();

    // Bypass the debounce directive by driving the handler directly.
    app.onSearchTerm('tanaka');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(app.quickResults().length).toBeGreaterThanOrEqual(1);
    expect(compiled.querySelector('#quick-search-results')).not.toBeNull();

    const firstResult = compiled.querySelector<HTMLButtonElement>(
      '#quick-search-results button',
    )!;
    expect(firstResult.textContent).toContain('Tanaka');

    // Zoneless navigation is async; assert the router intent directly.
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    firstResult.click();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const [commands] = navigateSpy.mock.calls[0] as unknown as [string[]];
    expect(commands[0]).toBe('/contacts');
    expect(commands[1]).toMatch(/.+/);
    expect(app.searchOpen()).toBe(false);
    expect(app.quickSearch()).toBe('');
  });

  it('separates CRM links from the activated ERM links in the sidebar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = [...compiled.querySelectorAll('.sidebar a')];
    // Dashboard, Contacts, Categories, Companies, Favorites + 2 CTAs + 4 ERM entries + AI CTA.
    expect(links.length).toBe(12);
    expect(links.some((link) => link.getAttribute('href') === '/companies')).toBe(true);
    expect(links.some((link) => link.getAttribute('href') === '/erm/cases')).toBe(true);
    expect(links.some((link) => link.getAttribute('href') === '/erm/escalations')).toBe(true);
    expect(links.some((link) => link.getAttribute('href') === '/erm/threat-assessments')).toBe(
      true,
    );
    expect(links.some((link) => link.getAttribute('href') === '/erm/legal-elements')).toBe(true);
    expect(links.some((link) => link.getAttribute('href') === '/ai-agent')).toBe(true);
    // Phase 2 is live: no placeholders or "coming soon" tags remain.
    expect(compiled.querySelectorAll('.sidebar-item-disabled').length).toBe(0);
    expect(compiled.querySelector('.phase-tag')).toBeNull();
  });
});
