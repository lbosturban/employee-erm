import { DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';

/**
 * Debounced input directive: defers the `debouncedInput` event emission
 * until the user stops typing for `debounceTime` milliseconds, which
 * avoids re-filtering large lists on every keystroke.
 *
 * Usage: <input appDebounceInput (debouncedInput)="search.set($event)" />
 */
@Directive({ selector: 'input[appDebounceInput]' })
export class DebounceInputDirective {
  private readonly elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Delay in milliseconds before the value is emitted. */
  readonly debounceTime = input<number>(250);

  readonly debouncedInput = output<string>();

  private timeoutId: number | null = null;

  constructor() {
    this.elementRef.nativeElement.addEventListener('input', () => this.scheduleEmission());
    this.destroyRef.onDestroy(() => this.cancel());
  }

  private scheduleEmission(): void {
    this.cancel();
    this.timeoutId = window.setTimeout(() => {
      this.debouncedInput.emit(this.elementRef.nativeElement.value);
    }, this.debounceTime());
  }

  private cancel(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
