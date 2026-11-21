import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { EscalationService } from '../../../core/services/escalation.service';

/** Temporary ERM Escalations stub — replaced by the full Phase-2 page. */
@Component({
  selector: 'app-escalations-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  templateUrl: './escalations-page.html',
  styleUrl: './escalations-page.css',
})
export class EscalationsPage {
  protected readonly escalationService = inject(EscalationService);
}
