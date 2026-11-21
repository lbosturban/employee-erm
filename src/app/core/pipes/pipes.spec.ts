import { SafeHtml } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { FullNamePipe } from './full-name.pipe';
import { InitialsPipe } from './initials.pipe';
import { JobLinePipe } from './job-line.pipe';
import { HighlightPipe } from './highlight.pipe';

/** Unwraps the trusted HTML payload of a bypassed SafeHtml value. */
function html(value: SafeHtml): string {
  return (value as unknown as { changingThisBreaksApplicationSecurity: string })
    .changingThisBreaksApplicationSecurity;
}

describe('FullNamePipe', () => {
  const pipe = new FullNamePipe();

  it('uppercases the last name', () => {
    expect(pipe.transform('Amina', 'Diallo')).toBe('Amina DIALLO');
  });

  it('handles missing parts and falls back to a dash', () => {
    expect(pipe.transform('Amina', '')).toBe('Amina');
    expect(pipe.transform('', 'Diallo')).toBe('DIALLO');
    expect(pipe.transform('', '')).toBe('—');
  });
});

describe('InitialsPipe', () => {
  const pipe = new InitialsPipe();

  it('returns two uppercase initials', () => {
    expect(pipe.transform('Amina', 'Diallo')).toBe('AD');
  });

  it('falls back to a question mark when nothing is available', () => {
    expect(pipe.transform('', '')).toBe('?');
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
