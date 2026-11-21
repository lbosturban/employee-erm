import { FormControl, FormGroup } from '@angular/forms';
import {
  strictEmailValidator,
  phoneValidator,
  hexColorValidator,
  contactNameValidator,
} from './custom-validators';

describe('custom validators', () => {
  describe('strictEmailValidator', () => {
    const validate = strictEmailValidator();
    const control = (value: string | null) => new FormControl(value ?? '');

    it('accepts valid emails', () => {
      expect(validate(control('user@example.com'))).toBeNull();
      expect(validate(control('first.last@sub.domain.io'))).toBeNull();
    });

    it('accepts quoted-string local parts (RFC-5322 dotted-string form)', () => {
      expect(validate(control('"john doe"@example.com'))).toBeNull();
    });

    it('rejects consecutive dots in the local part', () => {
      expect(validate(control('a..b@example.com'))).toEqual({ email: true });
    });

    it('rejects emails without a TLD', () => {
      expect(validate(control('user@localhost'))).toEqual({ email: true });
    });

    it('rejects emails with spaces', () => {
      expect(validate(control('user name@example.com'))).toEqual({ email: true });
    });

    it('rejects emails without an @ or domain', () => {
      expect(validate(control('plainstring'))).toEqual({ email: true });
      expect(validate(control('user@'))).toEqual({ email: true });
    });

    it('accepts empty values (combined with Validators.required)', () => {
      expect(validate(control(''))).toBeNull();
      expect(validate(control(null))).toBeNull();
    });
  });

  describe('phoneValidator', () => {
    const validate = phoneValidator();
    const control = (value: string | null) => new FormControl(value ?? '');

    it('accepts common phone formats', () => {
      expect(validate(control('+33 6 12 34 56 78'))).toBeNull();
      expect(validate(control('01.44.55.66.77'))).toBeNull();
      expect(validate(control('(0) 1-44-55-66-77'))).toBeNull();
    });

    it('accepts international numbers and extensions', () => {
      expect(validate(control('+81 3 4567 8910'))).toBeNull();
      expect(validate(control('01 44 55 66 77 ext 12'))).toBeNull();
    });

    it('rejects too few digits', () => {
      expect(validate(control('+33 6 12'))).toEqual({ phone: true });
    });

    it('rejects letters', () => {
      expect(validate(control('06 12 34 56 AB'))).toEqual({ phone: true });
    });

    it('accepts empty values', () => {
      expect(validate(control(''))).toBeNull();
      expect(validate(control(null))).toBeNull();
    });
  });

  describe('hexColorValidator', () => {
    const validate = hexColorValidator();
    const control = (value: string | null) => new FormControl(value ?? '');

    it('accepts #rgb and #rrggbb', () => {
      expect(validate(control('#fff'))).toBeNull();
      expect(validate(control('#2563eb'))).toBeNull();
    });

    it('rejects invalid color strings', () => {
      expect(validate(control('2563eb'))).toEqual({ color: true });
      expect(validate(control('#12345'))).toEqual({ color: true });
    });
  });

  describe('contactNameValidator', () => {
    const validate = contactNameValidator();

    /** Structured patch of name fields accepted by the helper. */
    interface NameFields {
      mode?: string;
      rawFullName?: string;
      firstName?: string;
      lastName?: string;
      middleNames?: string[];
    }

    const nameGroup = (fields: NameFields): FormGroup =>
      new FormGroup({
        mode: new FormControl<string>(fields.mode ?? ''),
        rawFullName: new FormControl<string>(fields.rawFullName ?? ''),
        firstName: new FormControl<string>(fields.firstName ?? ''),
        middleNames: new FormControl<string[]>(fields.middleNames ?? []),
        lastName: new FormControl<string>(fields.lastName ?? ''),
      });

    it('requires a raw full name in full mode', () => {
      expect(validate(nameGroup({ mode: 'full', rawFullName: '' }))).toEqual({
        contactName: { cause: 'rawFullName' },
      });
      expect(validate(nameGroup({ mode: 'full', rawFullName: '   ' }))).toEqual({
        contactName: { cause: 'rawFullName' },
      });
      expect(validate(nameGroup({ mode: 'full', rawFullName: 'Amina Diallo' }))).toBeNull();
    });

    it('requires at least one identifying token in structured mode', () => {
      expect(validate(nameGroup({ mode: 'structured' }))).toEqual({
        contactName: { cause: 'tokens' },
      });
      expect(validate(nameGroup({ mode: 'structured', firstName: 'Amina' }))).toBeNull();
      expect(validate(nameGroup({ mode: 'structured', lastName: 'Diallo' }))).toBeNull();
    });

    it('ignores groups without a mode', () => {
      expect(validate(new FormGroup({ name: new FormControl('') }))).toBeNull();
    });
  });
});

