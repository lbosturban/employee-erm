import { DestroyRef, Directive, ElementRef, inject, input, OnInit } from '@angular/core';

/**
 * Autofocus directive: focuses its host element after insertion.
 * Applied by default (or with `appAutofocus` / `[appAutofocus]="true"`)
 * and skipped when the condition evaluates to false.
 */
@Directive({ selector: '[appAutofocus]' })
export class AutofocusDirective implements OnInit {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly appAutofocus = input<boolean | string>(true);

  ngOnInit(): void {
    const { nativeElement } = this.elementRef as ElementRef<HTMLElement>;
    if (typeof nativeElement.focus !== 'function') {
      return;
    }
    // Defer to the next frame so the element is visible when focused.
    const frame = requestAnimationFrame(() => {
      if (this.isFocused() || !nativeElement.isConnected) {
        return;
      }
      nativeElement.focus();
    });
    this.destroyRef.onDestroy(() => cancelAnimationFrame(frame));
  }

  private isFocused(): boolean {
    return document.activeElement === this.elementRef.nativeElement;
  }
}
