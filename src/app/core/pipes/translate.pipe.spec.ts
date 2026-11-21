import { TestBed } from '@angular/core/testing';
import { I18nService } from '../services/i18n.service';
import { TranslatePipe } from './translate.pipe';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let i18n: I18nService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(I18nService);
    // The pipe injects I18nService, so it must be built in an injection context.
    pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
  });

  it('translates a key in the default language (English)', () => {
    expect(pipe.transform('nav.dashboard')).toBe('Dashboard');
  });

  it('re-translates the same key after a language switch', () => {
    expect(pipe.transform('nav.dashboard')).toBe('Dashboard');
    i18n.setLanguage('fr');
    // Same input, but the language signal has changed (impure pipe).
    expect(pipe.transform('nav.dashboard')).toBe('Tableau de bord');
  });

  it('falls back to the key when it is unknown', () => {
    expect(pipe.transform('never.existing')).toBe('never.existing');
  });
});
