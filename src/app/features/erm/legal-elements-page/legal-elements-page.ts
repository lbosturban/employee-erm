import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { LegalElementsService } from '../../../core/services/legal-elements.service';

/** Temporary Legal Elements stub — replaced by the full Phase-2 page. */
@Component({
  selector: 'app-legal-elements-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  templateUrl: './legal-elements-page.html',
  styleUrl: './legal-elements-page.css',
})
export class LegalElementsPage {
  protected readonly legalElementsService = inject(LegalElementsService);
}
