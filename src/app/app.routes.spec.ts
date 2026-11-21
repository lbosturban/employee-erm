import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appConfig } from './app.config';
import { ContactService } from './core/services/contact.service';
import { CategoryService } from './core/services/category.service';
import { ContactListPage } from './features/contacts/contact-list/contact-list';
import { ContactFormPage } from './features/contacts/contact-form/contact-form';
import { ContactDetailPage } from './features/contacts/contact-detail/contact-detail';
import { CategoryListPage } from './features/categories/category-list/category-list';
import { CategoryFormPage } from './features/categories/category-form/category-form';
import { CategoryDetailPage } from './features/categories/category-detail/category-detail';
import { DashboardPage } from './features/dashboard/dashboard';
import { FavoritesPage } from './features/favorites/favorites';
import { CompaniesPage } from './features/companies/companies-page/companies-page';

/**
 * Router integration tests: every entry point of the navigation
 * must resolve to its feature page (guards the "broken button" class of bugs).
 */
describe('app routes', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({ providers: appConfig.providers });
  });

  async function pageAt(url: string): Promise<unknown> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return harness.routeDebugElement?.componentInstance;
  }

  it('"/" renders the dashboard', async () => {
    expect((await pageAt('/')) instanceof DashboardPage).toBe(true);
  });

  it('"/contacts" renders the contact list', async () => {
    expect((await pageAt('/contacts')) instanceof ContactListPage).toBe(true);
  });

  it('"/contacts/new" renders the contact form', async () => {
    expect((await pageAt('/contacts/new')) instanceof ContactFormPage).toBe(true);
  });

  it('"/contacts/:id" renders the detail of a seeded contact', async () => {
    const contact = TestBed.inject(ContactService).contacts()[0];
    expect((await pageAt(`/contacts/${contact.id}`)) instanceof ContactDetailPage).toBe(true);
  });

  it('"/categories" renders the category list', async () => {
    expect((await pageAt('/categories')) instanceof CategoryListPage).toBe(true);
  });

  it('"/categories/new" renders the category form', async () => {
    expect((await pageAt('/categories/new')) instanceof CategoryFormPage).toBe(true);
  });

  it('"/categories/:id" renders the detail of a seeded category', async () => {
    const category = TestBed.inject(CategoryService).categories()[0];
    expect((await pageAt(`/categories/${category.id}`)) instanceof CategoryDetailPage).toBe(true);
  });

  it('"/companies" renders the companies list', async () => {
    expect((await pageAt('/companies')) instanceof CompaniesPage).toBe(true);
  });

  it('"/favorites" renders the favorites page', async () => {
    expect((await pageAt('/favorites')) instanceof FavoritesPage).toBe(true);
  });

  it('an unknown contact id redirects to the contacts list', async () => {
    await pageAt('/contacts/unknown-id');
    expect(TestBed.inject(Router).url).toBe('/contacts');
  });

  it('unknown urls redirect to the dashboard', async () => {
    await pageAt('/does-not-exist');
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
