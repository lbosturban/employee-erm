import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ThreatAssessmentService } from '../../../core/services/threat-assessment.service';

/** Temporary Threat Assessments stub — replaced by the full Phase-2 page. */
@Component({
  selector: 'app-threat-assessments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  templateUrl: './threat-assessments-page.html',
  styleUrl: './threat-assessments-page.css',
})
export class ThreatAssessmentsPage {
  protected readonly threatAssessmentService = inject(ThreatAssessmentService);
}
