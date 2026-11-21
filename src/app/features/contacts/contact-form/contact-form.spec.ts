import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { ContactFormPage } from './contact-form';
import { ContactService } from '../../../core/services/contact.service';
import { MigrationService } from '../../../core/services/migration.service';
import { Contact } from '../../../core/models/contact.model';

/** The protected `form` control, re-typed for structural assertions. */
function formOf(component: ContactFormPage): FormGroup {
  return component['form' as keyof ContactFormPage] as unknown as FormGroup;
}

/** Short accessor for the nested name group. */
function nameGroup(form: FormGroup): FormGroup {
  return form.controls['name'] as FormGroup;
}

describe('ContactFormPage', () => {
  let contactService: ContactService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
    // Domain services no longer seed themselves: the schema layer does.
    TestBed.inject(MigrationService).run();
    contactService = TestBed.inject(ContactService);
  });

  function instantiateWith(routeData: Record<string, unknown>): ContactFormPage {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: routeData } } },
      ],
    });
    // The test router has no routes: stub navigation so onSubmit stays sync.
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    // resetTestingModule dropped the seeded schema: re-run the migration.
    TestBed.inject(MigrationService).run();
    const component = TestBed.createComponent(ContactFormPage).componentInstance;
    contactService = TestBed.inject(ContactService);
    return component;
  }

  function instantiateNew(): ContactFormPage {
    return instantiateWith({});
  }

  function instantiateEdit(seed: Contact): ContactFormPage {
    // Edit mode is driven by the resolver-bound Contact (no id/timestamps).
    const { id, addedAt, updatedAt, ...contact } = seed;
    void id;
    void addedAt;
    void updatedAt;
    return instantiateWith({ contact });
  }

  it('starts valid when prefilled from the resolver data in edit mode', () => {
    const component = instantiateEdit(contactService.contacts()[0]);
    const form = formOf(component);
    expect(form.valid).toBe(true);
    expect((form.controls['name'] as FormGroup).getRawValue()['firstName']).toBe(
      contactService.contacts()[0].name.firstName,
    );
  });

  it('is pristine and requires input in create mode (full name and email/phone)', () => {
    const component = instantiateNew();
    const form = formOf(component);
    expect(form.valid).toBe(false);
    expect(form.controls['email'].errors).toEqual({ required: true });
    // The name group carries the contactNameValidator error.
    expect(nameGroup(form).errors).toEqual({ contactName: { cause: 'rawFullName' } });
  });

  it('rejects an invalid email and an invalid phone', () => {
    const component = instantiateNew();
    const form = formOf(component);
    form.patchValue({ email: 'not-an-email', phone: '12 ab' });
    expect(form.controls['email'].errors).toEqual({ email: true });
    expect(form.controls['phone'].errors).toEqual({ phone: true });
  });

  it('requires a name token in structured mode', () => {
    const component = instantiateNew();
    const form = formOf(component);
    form.patchValue({
      name: { mode: 'structured', rawFullName: '', firstName: '', lastName: '' },
    });
    expect(nameGroup(form).errors).toEqual({ contactName: { cause: 'tokens' } });
    form.patchValue({ name: { firstName: 'Ada' } });
    expect(nameGroup(form).errors).toBeNull();
  });

  it('allows deactivation when pristine, blocks it when dirty', () => {
    const component = instantiateNew();
    expect(component.canDeactivate()).toBe(true);
    // patchValue alone never marks a form dirty: mark it as a user edit would.
    formOf(component).patchValue({ name: { rawFullName: 'Changed Name' } });
    formOf(component).markAsDirty();
    expect(component.canDeactivate()).toBe(false);
  });

  it('maps empty category and company ids to null and creates the contact on submit', () => {
    const component = instantiateNew();
    const before = contactService.total();
    const form = formOf(component);
    form.patchValue({
      name: {
        mode: 'full',
        rawFullName: 'Nouveau Contact',
        firstName: '',
        middleNames: '',
        lastName: '',
      },
      email: 'nouveau.contact@example.com',
      phone: '+33 6 00 00 00 00',
      categoryId: '',
      companyId: '',
    });
    component.onSubmit();
    expect(contactService.total()).toBe(before + 1);
    const created = contactService
      .contacts()
      .find((contact) => contact.email === 'nouveau.contact@example.com');
    expect(created?.categoryId).toBeNull();
    expect(created?.companyId).toBeNull();
    expect(created?.name.mode).toBe('full');
    expect(created?.name.rawFullName).toBe('Nouveau Contact');
  });

  it('normalizes middle names into tokens when submitting a structured name', () => {
    const component = instantiateNew();
    const form = formOf(component);
    form.patchValue({
      name: {
        mode: 'structured',
        rawFullName: '',
        firstName: 'Ada',
        middleNames: 'Byron, King',
        lastName: 'Countess',
      },
      email: 'ada.lovelace@example.com',
      phone: '+33 6 11 22 33 44',
    });
    component.onSubmit();
    const created = contactService
      .contacts()
      .find((contact) => contact.email === 'ada.lovelace@example.com');
    expect(created?.name.middleNames).toEqual(['Byron', 'King']);
    expect(created?.hrProcessStatus).toBe('Pending');
  });
});
