import { TestBed } from '@angular/core/testing';
import { CompanyService } from './company.service';
import { MigrationService } from './migration.service';
import { ContactService } from './contact.service';

describe('CompanyService', () => {
  let service: CompanyService;
  let contactService: ContactService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MigrationService).run();
    contactService = TestBed.inject(ContactService);
    service = TestBed.inject(CompanyService);
  });

  it('seeds sample companies on first launch', () => {
    expect(service.total()).toBe(7);
    expect(service.companies()[0].name).toMatch(/.+/);
  });

  it('creates a company with a generated id and timestamp', () => {
    const created = service.create({
      name: 'Acme Aerospace',
      size: 'Large Enterprise',
      businessStructure: 'Corporation',
      sector: 'Manufacturing',
      contactId: null,
    });
    expect(created).not.toBeNull();
    expect(typeof created?.createdAt).toBe('string');
    expect(service.total()).toBe(8);
  });

  it('refuses duplicate names case-insensitively', () => {
    expect(service.create({
      name: 'novapart',
      size: 'Micro Enterprise',
      businessStructure: 'Individual',
      sector: 'Technology',
      contactId: null,
    })).toBeNull();
  });

  it('updates a company and rejects a name collision', () => {
    const first = service.companies()[0];
    const renamed = service.update(first.id, { name: 'Renamed Industries' });
    expect(renamed?.name).toBe('Renamed Industries');
    const other = service.companies()[1];
    expect(service.update(first.id, { name: other.name })).toBeNull();
  });

  it('exposes usage counts per company', () => {
    const usage = service.usageByCompany();
    const totalUsages = [...usage.values()].reduce((sum, count) => sum + count, 0);
    // Every company-assigned contact is accounted for exactly once.
    const assigned = contactService.contacts().filter((c) => c.companyId !== null).length;
    expect(totalUsages).toBe(assigned);
  });

  it('blocks deletion of a company still referenced by contacts', () => {
    const usedCompanyId = contactService
      .contacts()
      .find((contact) => contact.companyId !== null)?.companyId;
    if (!usedCompanyId) {
      return;
    }
    expect(service.remove(usedCompanyId)).toBe('inUse');
    expect(service.companies().some((company) => company.id === usedCompanyId)).toBe(true);
  });

  it('allows deleting an unused company', () => {
    const created = service.create({
      name: 'Lonely Works',
      size: 'Self-Employed Enterprise',
      businessStructure: 'Individual',
      sector: 'Retail',
      contactId: null,
    });
    expect(created && service.remove(created.id)).toBe('removed');
    expect(service.total()).toBe(7);
  });

  it('returns notFound when deleting an unknown id', () => {
    expect(service.remove('unknown')).toBe('notFound');
  });
});
