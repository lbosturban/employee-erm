import { Category } from './category.model';
import { Contact } from './contact.model';
import { Company } from './company.model';

/**
 * Full-database snapshot exchanged by the JSON Import/Export feature.
 * `schemaVersion` lets an importer validate or migrate the file before
 * anything touches localStorage.
 */
export interface DataSnapshot {
  schemaVersion: number;
  categories: Category[];
  companies: Company[];
  contacts: Contact[];
}
