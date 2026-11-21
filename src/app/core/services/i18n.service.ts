import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

export type Language = 'fr' | 'en';

type Dictionary = Record<string, string>;

/** English translations, used as the fallback language. */
const EN: Dictionary = {
  'app.title': 'Contacts ERM',
  'app.tagline': 'Manage your contacts cleanly',
  'nav.dashboard': 'Dashboard',
  'nav.contacts': 'Contacts',
  'nav.categories': 'Categories',
  'nav.favorites': 'Favorites',
  'nav.newContact': 'New contact',
  'theme.toggle': 'Toggle theme',
  'lang.switch': 'Change language',
  'footer.madeWith': 'Contacts ERM — local data, no backend',

  'dashboard.title': 'Dashboard',
  'dashboard.subtitle': 'Overview of your address book',
  'dashboard.totalContacts': 'Contacts',
  'dashboard.totalFavorites': 'Favorites',
  'dashboard.totalCategories': 'Categories',
  'dashboard.latest': 'Latest additions',
  'dashboard.byCategory': 'Contacts per category',
  'dashboard.uncategorized': 'Uncategorized contacts',
  'dashboard.seeAll': 'See all',
  'dashboard.companyBreakdown': 'Company activity',
  'dashboard.hrBreakdown': 'HR process status',

  'contacts.title': 'Contacts',
  'contacts.subtitle': 'Browse, sort and filter your contacts',
  'contacts.search': 'Search by name, company or job title…',
  'contacts.allCategories': 'All categories',
  'contacts.favoritesOnly': 'Favorites only',
  'contacts.sort': 'Sort',
  'contacts.sort.nameAsc': 'Name (A–Z)',
  'contacts.sort.nameDesc': 'Name (Z–A)',
  'contacts.sort.dateDesc': 'Newest first',
  'contacts.sort.dateAsc': 'Oldest first',
  'contacts.empty': 'No contact matches your filters.',
  'contacts.new': 'New contact',
  'contacts.addFavorite': 'Add to favorites',
  'contacts.removeFavorite': 'Remove from favorites',
  'contacts.edit': 'Edit',
  'contacts.delete': 'Delete',
  'contacts.detail': 'Details',
  'contacts.notes': 'Notes',
  'contacts.category': 'Category',
  'contacts.uncategorized': 'Uncategorized',
  'contacts.addedAt': 'Added on',
  'contacts.updatedAt': 'Updated on',
  'contacts.lastContacts': 'Latest additions',
  'contacts.companyActive': 'Active',
  'contacts.companyInactive': 'Inactive',
  'contacts.ceo': 'CEO',
  'contacts.filterHrStatus': 'Filter by HR status',
  'contacts.allHrStatuses': 'All HR statuses',
  'contacts.filterCompanyActive': 'Filter by company activity',
  'contacts.allCompanyActivity': 'All activity states',

  'hr.status.Pending': 'Pending',
  'hr.status.Active': 'Active',
  'hr.status.Inactive': 'Inactive',
  'hr.status.Archived': 'Archived',

  'contacts.import': 'Import JSON',
  'contacts.export': 'Export JSON',
  'contacts.imported': 'Import completed.',
  'contacts.importInvalid': 'Invalid file: expected contacts and categories arrays.',
  'contacts.exported': 'Export completed.',
  'contacts.exportVcard': 'Export as vCard',
  'contacts.importVcard': 'Import contacts (vCard)',
  'contacts.importVcardLabel': 'Import v-card',
  'contacts.vcardImported': 'vCard import completed.',
  'contacts.vcardNone': 'No contact found in this file.',

  'pagination.prev': 'Previous',
  'pagination.next': 'Next',
  'pagination.page': 'Page',
  'pagination.of': 'of',
  'pagination.pageSize': 'Per page',

  'favorites.title': 'Favorites',
  'favorites.subtitle': 'Your key contacts, always at hand',
  'favorites.empty': 'No favorites yet. Star a contact to find it here.',

  'categories.title': 'Categories',
  'categories.subtitle': 'Organize your contacts into groups',
  'categories.new': 'New category',
  'categories.name': 'Name',
  'categories.nameEn': 'Name (English)',
  'categories.nameFr': 'Name (French)',
  'categories.color': 'Color',
  'contacts.count': 'contacts',
  'categories.empty': 'No category yet.',
  'categories.inUse': 'This category still contains contacts and cannot be deleted.',
  'categories.duplicate': 'A category with this name already exists.',
  'categories.notFound': 'Category not found.',
  'categories.delete': 'Delete category',
  'categories.edit': 'Edit',
  'categories.contactsIn': 'Contacts in',
  'categories.back': 'Back to categories',
  'categories.emptyDetail': 'No contact in this category yet.',

  'form.createContact': 'Create a contact',
  'form.editContact': 'Edit contact',
  'form.createCategory': 'Create a category',
  'form.editCategory': 'Edit category',
  'form.firstName': 'First name',
  'form.lastName': 'Last name',
  'form.nameMode': 'Name entry mode',
  'form.nameModeFull': 'Full name',
  'form.nameModeStructured': 'Structured (tokens)',
  'form.rawFullName': 'Full name',
  'form.shortTitle': 'Short title',
  'form.longTitle': 'Long title',
  'form.middleNames': 'Middle names (comma-separated)',
  'form.culturalOrder': 'Name order',
  'form.culturalOrder.western': 'Western (given name first)',
  'form.culturalOrder.eastern': 'Eastern (family name first)',
  'form.culturalOrder.custom': 'Custom',
  'form.invalidName': 'Enter a full name, or at least a first or last name.',
  'form.city': 'City',
  'form.companyId': 'Company',
  'form.noCompany': 'No company',
  'form.companyActive': 'Still active in the company',
  'form.hrProcessStatus': 'HR status',
  'form.profileImage': 'Profile image URL',
  'form.profileImageAlt': 'Profile image description',
  'form.email': 'Email',
  'form.phone': 'Phone',
  'form.company': 'Company',
  'form.jobTitle': 'Job title',
  'form.category': 'Category',
  'form.favorite': 'Favorite',
  'form.notes': 'Notes',
  'form.save': 'Save',
  'form.cancel': 'Cancel',
  'form.required': 'This field is required.',
  'form.invalidEmail': 'Please enter a valid email address.',
  'form.invalidPhone': 'Please enter a valid phone number.',
  'form.selectPlaceholder': 'Select a category',
  'form.unsaved': 'You have unsaved changes. Leave this page anyway?',
  'form.saved': 'Changes saved.',

  'detail.structuredName': 'Structured name',

  'confirm.deleteContactTitle': 'Delete contact',
  'confirm.deleteContactMessage': 'Delete this contact permanently? This action cannot be undone.',
  'confirm.deleteCategoryTitle': 'Delete category',
  'confirm.deleteCategoryMessage':
    'Delete this category permanently? This action cannot be undone.',
  'confirm.yes': 'Delete',
  'confirm.no': 'Cancel',
};

/** French translations. Missing keys fall back to English above. */
const FR: Dictionary = {
  'app.tagline': 'Gérez vos contacts proprement',
  'nav.dashboard': 'Tableau de bord',
  'nav.contacts': 'Contacts',
  'nav.categories': 'Catégories',
  'nav.favorites': 'Favoris',
  'nav.newContact': 'Nouveau contact',
  'theme.toggle': 'Changer de thème',
  'lang.switch': 'Changer de langue',
  'footer.madeWith': 'Contacts ERM — données locales, sans backend',

  'dashboard.title': 'Tableau de bord',
  'dashboard.subtitle': 'Vue d’ensemble de votre répertoire',
  'dashboard.totalContacts': 'Contacts',
  'dashboard.totalFavorites': 'Favoris',
  'dashboard.totalCategories': 'Catégories',
  'dashboard.latest': 'Derniers ajouts',
  'dashboard.byCategory': 'Contacts par catégorie',
  'dashboard.uncategorized': 'Contacts sans catégorie',
  'dashboard.seeAll': 'Tout voir',
  'dashboard.companyBreakdown': 'Activité en entreprise',
  'dashboard.hrBreakdown': 'Statuts RH',

  'contacts.title': 'Contacts',
  'contacts.subtitle': 'Parcourez, triez et filtrez vos contacts',
  'contacts.search': 'Rechercher par nom, entreprise ou poste…',
  'contacts.allCategories': 'Toutes les catégories',
  'contacts.favoritesOnly': 'Favoris uniquement',
  'contacts.sort': 'Trier',
  'contacts.sort.nameAsc': 'Nom (A–Z)',
  'contacts.sort.nameDesc': 'Nom (Z–A)',
  'contacts.sort.dateDesc': 'Plus récents',
  'contacts.sort.dateAsc': 'Plus anciens',
  'contacts.empty': 'Aucun contact ne correspond à vos filtres.',
  'contacts.new': 'Nouveau contact',
  'contacts.addFavorite': 'Ajouter aux favoris',
  'contacts.removeFavorite': 'Retirer des favoris',
  'contacts.edit': 'Modifier',
  'contacts.delete': 'Supprimer',
  'contacts.detail': 'Détails',
  'contacts.notes': 'Notes',
  'contacts.category': 'Catégorie',
  'contacts.uncategorized': 'Sans catégorie',
  'contacts.addedAt': 'Ajouté le',
  'contacts.updatedAt': 'Modifié le',
  'contacts.lastContacts': 'Derniers ajouts',
  'contacts.companyActive': 'Actif',
  'contacts.companyInactive': 'Inactif',
  'contacts.ceo': 'PDG',
  'contacts.filterHrStatus': 'Filtrer par statut RH',
  'contacts.allHrStatuses': 'Tous les statuts RH',
  'contacts.filterCompanyActive': 'Filtrer par activité en entreprise',
  'contacts.allCompanyActivity': 'Tous les états',

  'hr.status.Pending': 'En attente',
  'hr.status.Active': 'Actif',
  'hr.status.Inactive': 'Inactif',
  'hr.status.Archived': 'Archivé',

  'contacts.import': 'Importer JSON',
  'contacts.export': 'Exporter JSON',
  'contacts.imported': 'Import terminé.',
  'contacts.importInvalid': 'Fichier invalide : tableaux contacts et catégories attendus.',
  'contacts.exported': 'Export terminé.',
  'contacts.exportVcard': 'Exporter en vCard',
  'contacts.importVcard': 'Importer des contacts (vCard)',
  'contacts.importVcardLabel': 'Importer v-card',
  'contacts.vcardImported': 'Import vCard terminé.',
  'contacts.vcardNone': 'Aucun contact trouvé dans ce fichier.',

  'pagination.prev': 'Précédent',
  'pagination.next': 'Suivant',
  'pagination.page': 'Page',
  'pagination.of': 'sur',
  'pagination.pageSize': 'Par page',

  'favorites.title': 'Favoris',
  'favorites.subtitle': 'Vos contacts clés, toujours à portée de main',
  'favorites.empty': 'Aucun favori pour l’instant.Étoilez un contact pour le retrouver ici.',

  'categories.title': 'Catégories',
  'categories.subtitle': 'Organisez vos contacts en groupes',
  'categories.new': 'Nouvelle catégorie',
  'categories.name': 'Nom',
  'categories.nameEn': 'Nom (anglais)',
  'categories.nameFr': 'Nom (français)',
  'categories.color': 'Couleur',
  'contacts.count': 'contact(s)',
  'categories.empty': 'Aucune catégorie pour le moment.',
  'categories.inUse': 'Cette catégorie contient encore des contacts et ne peut pas être supprimée.',
  'categories.duplicate': 'Une catégorie portant ce nom existe déjà.',
  'categories.notFound': 'Catégorie introuvable.',
  'categories.delete': 'Supprimer la catégorie',
  'categories.edit': 'Modifier',
  'categories.contactsIn': 'Contacts de',
  'categories.back': 'Retour aux catégories',
  'categories.emptyDetail': 'Aucun contact dans cette catégorie pour l’instant.',

  'form.createContact': 'Créer un contact',
  'form.editContact': 'Modifier le contact',
  'form.createCategory': 'Créer une catégorie',
  'form.editCategory': 'Modifier la catégorie',
  'form.firstName': 'Prénom',
  'form.lastName': 'Nom',
  'form.nameMode': 'Mode de saisie du nom',
  'form.nameModeFull': 'Nom complet',
  'form.nameModeStructured': 'Structuré (jetons)',
  'form.rawFullName': 'Nom complet',
  'form.shortTitle': 'Titre abrégé',
  'form.longTitle': 'Titre complet',
  'form.middleNames': 'Deuxièmes prénoms (séparés par des virgules)',
  'form.culturalOrder': 'Ordre du nom',
  'form.culturalOrder.western': 'Occidental (prénom en premier)',
  'form.culturalOrder.eastern': 'Oriental (nom de famille en premier)',
  'form.culturalOrder.custom': 'Personnalisé',
  'form.invalidName': 'Saisissez un nom complet, ou au moins un prénom ou un nom.',
  'form.city': 'Ville',
  'form.companyId': 'Entreprise',
  'form.noCompany': 'Aucune entreprise',
  'form.companyActive': 'Toujours en poste dans l’entreprise',
  'form.hrProcessStatus': 'Statut RH',
  'form.profileImage': 'URL de la photo de profil',
  'form.profileImageAlt': 'Description de la photo de profil',
  'form.email': 'Email',
  'form.phone': 'Téléphone',
  'form.company': 'Entreprise',
  'form.jobTitle': 'Poste',
  'form.category': 'Catégorie',
  'form.favorite': 'Favori',
  'form.notes': 'Notes',
  'form.save': 'Enregistrer',
  'form.cancel': 'Annuler',
  'form.required': 'Ce champ est obligatoire.',
  'form.invalidEmail': 'Veuillez saisir une adresse email valide.',
  'form.invalidPhone': 'Veuillez saisir un numéro de téléphone valide.',
  'form.selectPlaceholder': 'Choisir une catégorie',
  'form.unsaved': 'Vous avez des modifications non enregistrées. Quitter quand même ?',
  'form.saved': 'Modifications enregistrées.',

  'detail.structuredName': 'Nom structuré',

  'confirm.deleteContactTitle': 'Supprimer le contact',
  'confirm.deleteContactMessage':
    'Supprimer définitivement ce contact ? Cette action est irréversible.',
  'confirm.deleteCategoryTitle': 'Supprimer la catégorie',
  'confirm.deleteCategoryMessage':
    'Supprimer définitivement cette catégorie ? Cette action est irréversible.',
  'confirm.yes': 'Supprimer',
  'confirm.no': 'Annuler',
};

/**
 * Minimal FR/EN internationalization. A dictionary is served per
 * language through a signal, and templates consume it via the
 * `t` translate pipe. English is the default language.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private static readonly STORAGE_KEY = 'lang';

  private readonly dictionaries: Record<Language, Dictionary> = { en: EN, fr: FR };

  private readonly storage = inject(StorageService);

  readonly language = signal<Language>(this.loadLanguage());

  readonly label = computed(() => (this.language() === 'fr' ? 'Français' : 'English'));

  setLanguage(language: Language): void {
    this.language.set(language);
    document.documentElement.lang = language;
    void this.storage.write(I18nService.STORAGE_KEY, language);
  }

  toggleLanguage(): void {
    this.setLanguage(this.language() === 'fr' ? 'en' : 'fr');
  }

  /** Translates a key, falling back to English then the key itself. */
  translate(key: string): string {
    const { language } = this;
    return this.dictionaries[language()][key] ?? this.dictionaries.en[key] ?? key;
  }

  private loadLanguage(): Language {
    return this.storage.read<Language>(I18nService.STORAGE_KEY) === 'fr' ? 'fr' : 'en';
  }
}
