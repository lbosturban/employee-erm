/** A text available in both supported languages (en/fr). */
export interface BilingualText {
  en: string;
  fr: string;
}

/**
 * A category used to group contacts. Its name is bilingual so the
 * application can stay fully translated in FR and EN.
 */
export interface Category {
  id: string;
  name: BilingualText;
  /** Hex color used for the category badge (e.g. "#2563eb"). */
  color: string;
  createdAt: string;
}
