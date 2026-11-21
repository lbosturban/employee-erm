import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
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

  it('should render the vCard import button and drive the hidden file input', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = [...compiled.querySelectorAll('.header-tools .icon-btn')];
    // Import (labeled), language and theme buttons.
    expect(buttons.length).toBe(3);
    const importButton = buttons[0] as HTMLButtonElement;
    expect(importButton.textContent).toContain('Import');
    expect(importButton.textContent).toContain('📥');

    let opened = false;
    const hiddenInput = compiled.querySelector<HTMLInputElement>('.visually-hidden-input')!;
    hiddenInput.click = () => {
      opened = true;
      return;
    };
    importButton.click();
    expect(opened).toBe(true);
  });
});
