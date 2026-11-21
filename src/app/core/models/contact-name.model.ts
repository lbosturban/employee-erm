/**
 * Hybrid contact-naming model. A contact name can be entered either
 * directly as a free-text full name (`mode: 'full'`), or as structured,
 * culturally adaptable tokens (`mode: 'structured'`) that respect the
 * great variability of international naming conventions (order of family
 * and given names, titles, 0..N middle names, honorific suffixes...).
 */

/** How the name was entered by the user. */
export type NameMode = 'full' | 'structured';

/**
 * Token assembly order used when rendering a structured name:
 * - `western`: given names first, family name last ("John A. Smith");
 * - `eastern`: family name first, given names last ("Smith John A.");
 * - `custom`: lets the application extend to additional conventions
 *   (e.g. formatted `lastName, firstName`) in later iterations.
 */
export type CulturalOrder = 'western' | 'eastern' | 'custom';

/** Visible cultural label of the order, used in forms and tooltips. */
export const CULTURAL_ORDERS: CulturalOrder[] = ['western', 'eastern', 'custom'];

/** Structured + direct-entry name of a contact. */
export interface ContactName {
  /** 'full' renders {@link rawFullName} verbatim; 'structured' composes tokens. */
  mode: NameMode;
  /** Direct free-text entry — authoritative when mode is 'full'. */
  rawFullName: string;
  /** Abbreviated honorific ("Dr.", "Me.", "Mr."). */
  shortTitle?: string;
  /** Spelled-out honorific ("Doctor", "Maître", "Monsieur"). */
  longTitle?: string;
  /** Given name. */
  firstName: string;
  /** 0..N middle name tokens, kept verbatim (initials or full tokens). */
  middleNames: string[];
  /** Family name. */
  lastName: string;
  /** Token assembly order — 'custom' supports future conventions. */
  culturalOrder: CulturalOrder;
}

/**
 * Renders a {@link ContactName} into a display string. Falls back
 * gracefully: an empty structured name renders as the raw full name,
 * and an empty raw full name renders via the structured tokens, so the
 * pipe never returns a blank label for a partially-filled record.
 */
export function composeFullName(name: ContactName | null | undefined): string {
  if (!name) {
    return '';
  }
  if (name.mode === 'full') {
    return normalizeToken(name.rawFullName) || composeTokens(name);
  }
  return composeTokens(name) || normalizeToken(name.rawFullName);
}

/** Assembles the structured tokens according to the configured order. */
function composeTokens(name: ContactName): string {
  const shortTitle = normalizeToken(name.shortTitle);
  const first = normalizeToken(name.firstName);
  const middles = (name.middleNames ?? []).map(normalizeToken).filter((token) => token !== '');
  const last = normalizeToken(name.lastName);

  if (first === '' && last === '' && middles.length === 0) {
    return '';
  }

  // Eastern order: family name leads. Western and custom: given names lead.
  // 'custom' keeps the primary rendering simple; the pipe can diverge later.
  const core =
    name.culturalOrder === 'eastern' ? [last, ...middles, first] : [first, ...middles, last];
  const composed = core.filter((token) => token !== '').join(' ').trim();

  // Prefer the spelled-out honorific, fall back to the abbreviated one.
  const title = normalizeToken(name.longTitle) || shortTitle;
  return title ? `${title} ${composed}`.trim() : composed;
}

/** Collapses redundant whitespace inside a single token. */
function normalizeToken(token: string | null | undefined): string {
  return (token ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * True when a name carries enough information to be displayed:
 * either a non-empty raw full name or at least one non-empty token.
 */
export function isNameEmpty(name: ContactName | null | undefined): boolean {
  if (!name) {
    return true;
  }
  return composeFullName(name).trim() === '';
}

/** Creates an empty, fully-initialized name object (form baseline). */
export function emptyContactName(culturalOrder: CulturalOrder = 'western'): ContactName {
  return {
    mode: 'full',
    rawFullName: '',
    firstName: '',
    middleNames: [],
    lastName: '',
    culturalOrder,
  };
}
