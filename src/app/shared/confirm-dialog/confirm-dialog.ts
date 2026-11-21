import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

/**
 * Accessible confirmation dialog. Rendered by parent pages when a signal
 * state is set; emits `confirmed` or `cancelled` according to the user
 * choice. Focus is trapped by the modal CSS overlay, escapable via Escape.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
