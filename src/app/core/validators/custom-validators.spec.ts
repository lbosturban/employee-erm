import { FormControl } from '@angular/forms';
import { strictEmailValidator, phoneValidator, hexColorValidator } from './custom-validators';

describe('custom validators', () => {
  describe('strictEmailValidator', () => {
    const validate = strictEmailValidator();
    const control = (value: string | null) => new FormControl(value ?? '');

    it('accepts valid emails', () => {
      expect(validate(control('user@example.com'))).toBeNull();
      expect(validate(control('first.last@sub.domain.io'))).toBeNull();
    });

    it('rejects emails without a TLD', () => {
      expect(validate(control('user@localhost'))).toEqual({ email: true });
    });

    it('rejects emails with spaces', () => {
      expect(validate(control('user name@example.com'))).toEqual({ email: true });
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
});
