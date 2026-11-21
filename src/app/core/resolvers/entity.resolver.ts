import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { Category } from '../models/category.model';
import { Company } from '../models/company.model';
import { Contact } from '../models/contact.model';
import { ContactService } from '../services/contact.service';
import { CategoryService } from '../services/category.service';
import { CompanyService } from '../services/company.service';

/**
 * Preloads the contact referenced by the `:id` route parameter so the
 * detail and edit pages start with data already available. Unknown ids
 * redirect back to the contacts list.
 */
export const contactResolver: ResolveFn<Contact | null> = (route) => {
  const id = route.paramMap.get('id') ?? '';
  const contact = inject(ContactService).getById(id);
  if (!contact) {
    void inject(Router).navigateByUrl('/contacts');
    return null;
  }
  return contact;
};

/** Same contract for the category detail and edit pages. */
export const categoryResolver: ResolveFn<Category | null> = (route) => {
  const id = route.paramMap.get('id') ?? '';
  const category = inject(CategoryService).getById(id);
  if (!category) {
    void inject(Router).navigateByUrl('/categories');
    return null;
  }
  return category;
};

/** Same contract for company detail and edit pages. */
export const companyResolver: ResolveFn<Company | null> = (route) => {
  const id = route.paramMap.get('id') ?? '';
  const company = inject(CompanyService).getById(id);
  if (!company) {
    void inject(Router).navigateByUrl('/companies');
    return null;
  }
  return company;
};
