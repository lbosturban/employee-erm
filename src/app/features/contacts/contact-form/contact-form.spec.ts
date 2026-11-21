import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { ContactFormPage } from './contact-form';
import { ContactService } from '../../../core/services/contact.service';
import { Contact } from '../../../core/models/contact.model';

/** Structural view of the protected form shape, for test assertions. */
interface FormLike {
  valid: boolean;
  controls: Record<string, { errors: Record<string, unknown> | null }>;
  patchValue(value: Record<string, unknown>): void;
  getRawValue(): Record<string, unknown>;
  markAsDirty(): void;
}

function formOf(component: ContactFormPage): FormLike {
  return component['form' as keyof ContactFormPage] as unknown as FormLike;
}

describe('ContactFormPage', () => {
  let contactService: ContactService;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({});
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
    return TestBed.createComponent(ContactFormPage).componentInstance;
  }

  function instantiateNew(): ContactFormPage {
    const component = instantiateWith({});
    // TestBed was reset: refresh the reference so assertions target the
    // same service instance the component uses.
    contactService = TestBed.inject(ContactService);
    return component;
  }

  function instantiateEdit(seed: Contact): ContactFormPage {
    const { id, createdAt, updatedAt, ...draft } = seed;
    void id;
    void createdAt;
    void updatedAt;
    const component = instantiateWith({ contact: draft });
    contactService = TestBed.inject(ContactService);
    return component;
  }

  it('starts valid when prefilled from the resolver data in edit mode', () => {
    const component = instantiateEdit(contactService.contacts()[0]);
    expect(formOf(component).valid).toBe(true);
    expect(formOf(component).getRawValue()['firstName']).toBe(
      contactService.contacts()[0].firstName,
    );
  });

  it('is pristine and requires input in create mode', () => {
    const component = instantiateNew();
    expect(formOf(component).valid).toBe(false);
    expect(formOf(component).controls['firstName'].errors).toEqual({ required: true });
  });

  it('rejects an invalid email and an invalid phone', () => {
    const component = instantiateNew();
    formOf(component).patchValue({ email: 'not-an-email', phone: '12 ab' });
    expect(formOf(component).controls['email'].errors).toEqual({ email: true });
    expect(formOf(component).controls['phone'].errors).toEqual({ phone: true });
  });

  it('allows deactivation when pristine, blocks it when dirty', () => {
    const component = instantiateNew();
    expect(component.canDeactivate()).toBe(true);
    // patchValue alone never marks a form dirty: mark it as a user edit would.
    formOf(component).patchValue({ firstName: 'Changed' });
    formOf(component).markAsDirty();
    expect(component.canDeactivate()).toBe(false);
  });

  it('maps an empty categoryId to null and creates the contact on submit', () => {
    const component = instantiateNew();
    const before = contactService.total();
    formOf(component).patchValue({
      firstName: 'Nouveau',
      lastName: 'Contact',
      email: 'nouveau.contact@example.com',
      phone: '+33 6 00 00 00 00',
      categoryId: '',
    });
    component.onSubmit();
    expect(contactService.total()).toBe(before + 1);
    const created = contactService
      .contacts()
      .find((contact) => contact.email === 'nouveau.contact@example.com');
    expect(created?.categoryId).toBeNull();
  });
});
