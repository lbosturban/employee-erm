import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(I18nService);
  });

  it('defaults to English', () => {
    expect(service.language()).toBe('en');
    expect(service.translate('nav.contacts')).toBe('Contacts');
  });

  it('switches to French and translates', () => {
    service.setLanguage('fr');
    expect(service.language()).toBe('fr');
    expect(service.translate('nav.contacts')).toBe('Contacts');
    expect(service.translate('nav.dashboard')).toBe('Tableau de bord');
  });

  it('falls back to English for keys missing in French', () => {
    service.setLanguage('fr');
    expect(service.translate('app.title')).toBe('Contacts ERM');
  });

  it('returns the key itself when it is unknown', () => {
    expect(service.translate('nope.nope')).toBe('nope.nope');
  });

  it('persists the language choice', () => {
    service.setLanguage('fr');
    expect(window.localStorage.getItem('contacts-erm:lang')).toContain('fr');
  });
});
