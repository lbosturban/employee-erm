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

  // ── Phase 2 — ERM product line (all URLs under /erm flip the brand) ──
  {
    path: 'erm/cases',
    title: 'Contacts ERM — ERM Cases',
    loadComponent: () =>
      import('./features/erm/cases-page/cases-page').then((m) => m.CasesPage),
  },
  {
    path: 'erm/escalations',
    title: 'Contacts ERM — ERM Escalations',
    loadComponent: () =>
      import('./features/erm/escalations-page/escalations-page').then((m) => m.EscalationsPage),
  },
  {
    path: 'erm/threat-assessments',
    title: 'Contacts ERM — Threat Assessments',
    loadComponent: () =>
      import('./features/erm/threat-assessments-page/threat-assessments-page').then(
        (m) => m.ThreatAssessmentsPage,
      ),
  },
  {
    path: 'erm/legal-elements',
    title: 'Contacts ERM — Legal Elements',
    loadComponent: () =>
      import('./features/erm/legal-elements-page/legal-elements-page').then(
        (m) => m.LegalElementsPage,
      ),
  },
  // ── Phase 3 — AI Agent section (placeholder; also flips the brand) ──
  {
    path: 'ai-agent',
    title: 'Contacts ERM — AI Agent',
    loadComponent: () =>
      import('./features/ai/agent-page/agent-page').then((m) => m.AgentPage),
  },
  { path: '**', redirectTo: '' },
];
