import { SafeHtml } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { FullNamePipe } from './full-name.pipe';
import { InitialsPipe } from './initials.pipe';
import { JobLinePipe } from './job-line.pipe';
import { HighlightPipe } from './highlight.pipe';
import { ContactName } from '../models/contact-name.model';

/** Unwraps the trusted HTML payload of a bypassed SafeHtml value. */
function html(value: SafeHtml): string {
  return (value as unknown as { changingThisBreaksApplicationSecurity: string })
    .changingThisBreaksApplicationSecurity;
}

/** Shorthand structured-name builder. */
function structured(parts: Partial<ContactName>): ContactName {
  return {
    mode: 'structured',
    rawFullName: '',
    firstName: '',
    middleNames: [],
    lastName: '',
    culturalOrder: 'western',
    ...parts,
  };
}

describe('FullNamePipe', () => {
  const pipe = new FullNamePipe();

  it('renders the raw full name verbatim in full mode', () => {
    expect(pipe.transform({ mode: 'full', rawFullName: 'Amina Diallo' } as ContactName)).toBe(
      'Amina Diallo',
    );
  });

  it('composes structured tokens in western order with the family name last', () => {
    expect(
      pipe.transform(
        structured({
          firstName: 'Julien',
          middleNames: ['Marie'],
          lastName: 'Moreau',
        }),
      ),
    ).toBe('Julien Marie Moreau');
  });

  it('composes structured tokens in eastern order, family name first', () => {
    expect(
      pipe.transform(
        structured({
          firstName: 'Hiroshi',
          middleNames: ['Kenji'],
          lastName: 'Tanaka',
          culturalOrder: 'eastern',
          longTitle: 'Doctor',
        }),
      ),
    ).toBe('Doctor Tanaka Kenji Hiroshi');
  });

  it('prefers the long title and falls back to the short title', () => {
    expect(
      pipe.transform(
        structured({ firstName: 'Claire', lastName: 'Duval', shortTitle: 'Me.', longTitle: 'Maître' }),
      ),
    ).toBe('Maître Claire Duval');
    expect(
      pipe.transform(structured({ firstName: 'Claire', lastName: 'Duval', shortTitle: 'Me.' })),
    ).toBe('Me. Claire Duval');
  });

  it('falls back to the raw full name when structured tokens are empty', () => {
    expect(pipe.transform({ ...structured({}), mode: 'structured', rawFullName: 'Lone Name' })).toBe(
      'Lone Name',
    );
  });

  it('accepts and trims plain strings, rendering a dash for empty names', () => {
    expect(pipe.transform('  Amina  ')).toBe('Amina');
    expect(pipe.transform('   ')).toBe('—');
    expect(pipe.transform(null)).toBe('—');
  });
});

describe('InitialsPipe', () => {
  const pipe = new InitialsPipe();

  it('returns the first two uppercase initials from a structured name', () => {
    expect(pipe.transform(structured({ firstName: 'Amina', lastName: 'Diallo' }))).toBe('AD');
  });

  it('returns family-name-first initials for eastern order', () => {
    expect(
      pipe.transform(
        structured({ firstName: 'Hiroshi', lastName: 'Tanaka', culturalOrder: 'eastern' }),
      ),
    ).toBe('TH');
  });

  it('strips honorific punctuation before extracting initials', () => {
    expect(
      pipe.transform(
        structured({ shortTitle: 'Me.', longTitle: '', firstName: 'Léa', lastName: 'Marchand' }),
      ),
    ).toBe('LM');
  });

  it('uses the first two letters for single-token names', () => {
    expect(pipe.transform({ mode: 'full', rawFullName: 'Madonna' } as ContactName)).toBe('MA');
  });

  it('falls back to a question mark when nothing is available', () => {
    expect(pipe.transform(structured({}))).toBe('?');
    expect(pipe.transform('')).toBe('?');
  });
});

describe('JobLinePipe', () => {
  const pipe = new JobLinePipe();

  it('joins title and company', () => {
    expect(pipe.transform('CTO', 'TechWave')).toBe('CTO · TechWave');
  });

  it('returns the only available part', () => {
    expect(pipe.transform('CTO', '')).toBe('CTO');
    expect(pipe.transform('', 'TechWave')).toBe('TechWave');
  });
});

describe('HighlightPipe', () => {
  // Uses TestBed because the pipe injects DomSanitizer.
  let pipe: HighlightPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    // The pipe injects DomSanitizer, so it must be built in an injection context.
    pipe = TestBed.runInInjectionContext(() => new HighlightPipe());
  });

  it('wraps matches in a mark tag', () => {
    expect(html(pipe.transform('Amina Diallo', 'amin'))).toBe('<mark>Amin</mark>a Diallo');
  });

  it('is case-insensitive', () => {
    expect(html(pipe.transform('Amina', 'INA'))).toBe('Am<mark>ina</mark>');
  });

  it('escapes HTML in the source text', () => {
    expect(html(pipe.transform('<b>Jules</b>', ''))).toBe('&lt;b&gt;Jules&lt;/b&gt;');
  });

  it('treats regex metacharacters literally', () => {
    expect(html(pipe.transform('a(b)c', '('))).toBe('a<mark>(</mark>b)c');
  });

  it('returns the escaped text unchanged without a term', () => {
    expect(html(pipe.transform('Plain text', ''))).toBe('Plain text');
  });
});
