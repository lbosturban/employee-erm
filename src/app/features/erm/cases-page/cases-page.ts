import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CaseService } from '../../../core/services/case.service';

/** Temporary ERM Cases stub — replaced by the full Phase-2 page. */
@Component({
  selector: 'app-cases-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  templateUrl: './cases-page.html',
  styleUrl: './cases-page.css',
})
export class CasesPage {
  protected readonly caseService = inject(CaseService);
}
