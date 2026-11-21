import { Routes } from '@angular/router';
import { canDeactivateGuard } from './core/guards/can-deactivate.guard';
import { contactResolver, categoryResolver } from './core/resolvers/entity.resolver';

/**
 * Application shell routes. Feature pages are lazy-loaded via
 * loadComponent; detail and edit routes are backed by resolvers that
 * preload the entity and redirect when the id is unknown.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Contacts ERM — Dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.DashboardPage),
  },
  {
    path: 'contacts',
    title: 'Contacts ERM — Contacts',
    loadComponent: () =>
      import('./features/contacts/contact-list/contact-list').then((m) => m.ContactListPage),
  },
  {
    path: 'contacts/new',
    title: 'Contacts ERM — New contact',
    loadComponent: () =>
      import('./features/contacts/contact-form/contact-form').then((m) => m.ContactFormPage),
    canDeactivate: [canDeactivateGuard],
  },
  {
    path: 'contacts/:id',
    title: 'Contacts ERM — Contact detail',
    loadComponent: () =>
      import('./features/contacts/contact-detail/contact-detail').then((m) => m.ContactDetailPage),
    resolve: { contact: contactResolver },
  },
  {
    path: 'contacts/:id/edit',
    title: 'Contacts ERM — Edit contact',
    loadComponent: () =>
      import('./features/contacts/contact-form/contact-form').then((m) => m.ContactFormPage),
    resolve: { contact: contactResolver },
    canDeactivate: [canDeactivateGuard],
  },
  {
    path: 'categories',
    title: 'Contacts ERM — Categories',
    loadComponent: () =>
      import('./features/categories/category-list/category-list').then((m) => m.CategoryListPage),
  },
  {
    path: 'categories/new',
    title: 'Contacts ERM — New category',
    loadComponent: () =>
      import('./features/categories/category-form/category-form').then((m) => m.CategoryFormPage),
    canDeactivate: [canDeactivateGuard],
  },
  {
    path: 'categories/:id',
    title: 'Contacts ERM — Category',
    loadComponent: () =>
      import('./features/categories/category-detail/category-detail').then(
        (m) => m.CategoryDetailPage,
      ),
    resolve: { category: categoryResolver },
  },
  {
    path: 'categories/:id/edit',
    title: 'Contacts ERM — Edit category',
    loadComponent: () =>
      import('./features/categories/category-form/category-form').then((m) => m.CategoryFormPage),
    resolve: { category: categoryResolver },
    canDeactivate: [canDeactivateGuard],
  },
  {
    path: 'companies',
    title: 'Contacts ERM — Companies',
    loadComponent: () =>
      import('./features/companies/companies-page/companies-page').then((m) => m.CompaniesPage),
  },
  {
    path: 'favorites',
    title: 'Contacts ERM — Favorites',
    loadComponent: () => import('./features/favorites/favorites').then((m) => m.FavoritesPage),
  },
  { path: '**', redirectTo: '' },
];
