import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { BrandService, brandModeFromUrl } from './brand.service';

describe('brandModeFromUrl', () => {
  it('selects the ERM brand for /erm prefixed URLs', () => {
    expect(brandModeFromUrl('/erm')).toBe('erm');
    expect(brandModeFromUrl('/erm/cases')).toBe('erm');
    expect(brandModeFromUrl('/erm/cases/detail')).toBe('erm');
  });

  it('keeps the CRM brand for every other URL', () => {
    expect(brandModeFromUrl('/')).toBe('crm');
    expect(brandModeFromUrl('/contacts')).toBe('crm');
    expect(brandModeFromUrl('/ermicrosoft')).toBe('crm'); // prefix must not leak
    expect(brandModeFromUrl('')).toBe('crm');
  });
});

describe('BrandService', () => {
  let events: Subject<NavigationEnd>;
  let service: BrandService;

  beforeEach(() => {
    events = new Subject<NavigationEnd>();
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { events } }],
    });
    service = TestBed.inject(BrandService);
  });

  it('starts in CRM mode with the CRM logo and title', () => {
    expect(service.brandMode()).toBe('crm');
    expect(service.logo()).toBe('contacts-erm.svg');
    expect(service.titleKey()).toBe('app.title');
    expect(service.isErm()).toBe(false);
  });

  it('switches logo and title on an /erm navigation, back on a CRM one', () => {
    events.next(new NavigationEnd(1, '/erm/cases', '/erm/cases'));
    expect(service.brandMode()).toBe('erm');
    expect(service.logo()).toBe('connects-erm.svg');
    expect(service.titleKey()).toBe('app.titleErm');
    expect(service.isErm()).toBe(true);

    events.next(new NavigationEnd(2, '/contacts', '/contacts'));
    expect(service.brandMode()).toBe('crm');
    expect(service.logo()).toBe('contacts-erm.svg');
    expect(service.titleKey()).toBe('app.title');
    expect(service.isErm()).toBe(false);
  });

  it('honors redirects via urlAfterRedirects', () => {
    events.next(new NavigationEnd(1, '/old-target', '/erm/threat-assessments'));
    expect(service.brandMode()).toBe('erm');
  });
});
