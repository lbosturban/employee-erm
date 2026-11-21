import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  THREAT_LEVELS,
  THREAT_SECTIONS,
  THREAT_SEVERITIES,
  ThreatAssessment,
  ThreatAssessmentDraft,
  ThreatLevel,
  ThreatSection,
} from '../../../core/models/phase2/threat-assessment.model';
import { Contact } from '../../../core/models/contact.model';
import { ThreatAssessmentService } from '../../../core/services/threat-assessment.service';
import { ContactService } from '../../../core/services/contact.service';
import { CompanyService } from '../../../core/services/company.service';
import { I18nService } from '../../../core/services/i18n.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FullNamePipe } from '../../../core/pipes/full-name.pipe';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { AutofocusDirective } from '../../../core/directives/autofocus.directive';

/** Qualitative severity recorded per DCJS section. */
type ThreatSeverity = (typeof THREAT_SEVERITIES)[number];

/** Strictly-typed control slate for one DCJS section inside the modal. */
type ThreatSectionControls = FormGroup<{
  findings: FormControl<string>;
  severity: FormControl<ThreatSeverity>;
}>;

/** Value of the overall threat-level filter, including the "all" option. */
type ThreatLevelFilter = ThreatLevel | 'all';

/**
 * ERM threat assessments: company-threat evaluations bound to a contact
 * (the subject of concern) with an optional company context, structured
 * after the Virginia DCJS threat assessment and management form.
 */
@Component({
  selector: 'app-threat-assessments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, TranslatePipe, FullNamePipe, ConfirmDialog, AutofocusDirective],
  templateUrl: './threat-assessments-page.html',
  styleUrl: './threat-assessments-page.css',
})
export class ThreatAssessmentsPage {
  protected readonly threatAssessmentService = inject(ThreatAssessmentService);
  private readonly companyService = inject(CompanyService);
  private readonly contactService = inject(ContactService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly i18n = inject(I18nService);

  // -- Managed vocabularies exposed as translatable select options ----------

  protected readonly sectionKeys: readonly ThreatSection[] = THREAT_SECTIONS;

  protected readonly levelOptions = THREAT_LEVELS.map((level) => ({
    value: level,
    labelKey: `threat.level.${level}`,
  }));

  protected readonly severityOptions = THREAT_SEVERITIES.map((severity) => ({
    value: severity,
    labelKey: `severity.${severity}`,
  }));

  // -- Page state -----------------------------------------------------------

  /** Overall threat level selected in the filter bar ('all' shows every card). */
  protected readonly filterLevel = signal<ThreatLevelFilter>('all');

  /** Banner for a confirmed-but-failed deletion (persist error, not found). */
  protected readonly errorMessage = signal<string | null>(null);

  /** Assessment waiting for the confirmation dialog. */
  protected readonly pendingDeletion = signal<ThreatAssessment | null>(null);

  /** Modal state: the assessment being edited, or null in create mode. */
  protected readonly editingAssessment = signal<ThreatAssessment | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly isEdit = computed(() => this.editingAssessment() !== null);

  /** Id of the (single) card whose DCJS sections are currently expanded. */
  protected readonly expandedId = signal<string | null>(null);

  protected readonly submitAttempted = signal(false);

  /** Contacts available as subject options in the modal select. */
  protected readonly contacts = this.contactService.contacts;

  /** Companies available as context options in the modal select. */
  protected readonly companies = this.companyService.companies;

  protected readonly form = this.formBuilder.group({
    contactId: ['', [Validators.required]],
    companyId: [''],
    overallThreat: [THREAT_LEVELS[0]],
    sections: this.formBuilder.array<ThreatSectionControls>(
      THREAT_SECTIONS.map(() =>
        this.formBuilder.group({
          findings: [''],
          severity: [THREAT_SEVERITIES[0]],
        }),
      ),
    ),
  });

  protected get sectionControls(): ThreatSectionControls[] {
    return this.form.controls.sections.controls;
  }

  // -- Cards ----------------------------------------------------------------

  /** Assessments matching the current overall threat level filter. */
  protected readonly filtered = computed(() => {
    const level = this.filterLevel();
    const assessments = this.threatAssessmentService.assessments();
    return level === 'all'
      ? assessments
      : assessments.filter((assessment) => assessment.overallThreat === level);
  });

  /** Contact acting as subject of concern, or null when no longer tracked. */
  protected subjectOf(assessment: ThreatAssessment): Contact | null {
    return this.contactService.getById(assessment.contactId);
  }

  /** Company context of the assessment, or null when none is recorded. */
  protected companyOf(assessment: ThreatAssessment): { name: string } | null {
    return assessment.companyId === null
      ? null
      : this.companyService.getById(assessment.companyId);
  }

  /** Name of the subject of concern, formatted through the full name pipe. */
  protected subjectName(assessment: ThreatAssessment): string {
    const contact = this.subjectOf(assessment);
    return contact
      ? new FullNamePipe().transform(contact.name)
      : '—';
  }

  /** Number of DCJS sections with non-empty findings, out of ten. */
  protected progressOf(assessment: ThreatAssessment): number {
    return assessment.sections.filter(
      (entry) => entry.findings.trim().length > 0,
    ).length;
  }

  protected toggleExpanded(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  protected sectionLabelKey(section: ThreatSection): string {
    return `threat.section.${section}`;
  }

  protected severityLabelKey(severity: ThreatSeverity): string {
    return `severity.${severity}`;
  }

  /** Green→amber→red badge classes, staying inside the design tokens. */
  protected levelBadgeClass(level: ThreatLevel): string {
    const palette: Record<ThreatLevel, string> = {
      'no-risk': 'threat-badge-no-risk',
      minor: 'threat-badge-minor',
      moderate: 'threat-badge-moderate',
      major: 'threat-badge-major',
      imminent: 'threat-badge-imminent',
    };
    return `badge ${palette[level]}`;
  }

  protected severityBadgeClass(severity: ThreatSeverity): string {
    const palette: Record<ThreatSeverity, string> = {
      unknown: 'threat-badge-unknown',
      low: 'threat-badge-minor',
      moderate: 'threat-badge-moderate',
      high: 'threat-badge-major',
      critical: 'threat-badge-imminent',
    };
    return `badge ${palette[severity]}`;
  }

  // -- Filter ---------------------------------------------------------------

  protected onFilterChange(event: Event): void {
    const target = event.target;
    const value = target instanceof HTMLSelectElement ? target.value : 'all';
    this.filterLevel.set(
      (THREAT_LEVELS as readonly string[]).includes(value)
        ? (value as ThreatLevelFilter)
        : 'all',
    );
  }

  // -- Modal lifecycle ------------------------------------------------------

  openCreateModal(): void {
    this.editingAssessment.set(null);
    this.formOpen.set(true);
    this.form.reset({
      contactId: '',
      companyId: '',
      overallThreat: THREAT_LEVELS[0],
    });
    for (const control of this.sectionControls) {
      control.reset({ findings: '', severity: THREAT_SEVERITIES[0] });
    }
    this.submitAttempted.set(false);
  }

  openEditModal(assessment: ThreatAssessment): void {
    this.editingAssessment.set(assessment);
    this.formOpen.set(true);
    this.form.reset({
      contactId: assessment.contactId,
      companyId: assessment.companyId ?? '',
      overallThreat: assessment.overallThreat,
    });
    const bySection = new Map(assessment.sections.map((entry) => [entry.section, entry]));
    this.sectionControls.forEach((control, index) => {
      const entry = bySection.get(THREAT_SECTIONS[index]);
      control.reset({
        findings: entry ? entry.findings : '',
        severity: entry ? entry.severity : THREAT_SEVERITIES[0],
      });
    });
    this.submitAttempted.set(false);
  }

  closeModal(): void {
    this.editingAssessment.set(null);
    this.formOpen.set(false);
  }

  hasError(name: 'contactId'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.dirty || control.touched || this.submitAttempted());
  }

  onSave(): void {
    if (this.form.invalid) {
      this.submitAttempted.set(true);
      this.form.markAllAsTouched();
      return;
    }
    const { contactId, companyId, overallThreat } = this.form.getRawValue();
    const sections = this.sectionControls.map((control, index) => ({
      section: THREAT_SECTIONS[index],
      findings: control.controls.findings.value.trim(),
      severity: control.controls.severity.value,
    }));
    const draft: ThreatAssessmentDraft = {
      contactId,
      companyId: companyId === '' ? null : companyId,
      sections,
      overallThreat,
    };
    const editing = this.editingAssessment();
    // The modal stays open when the underlying record disappeared, which
    // can only happen if another tab removed it meanwhile.
    if (editing) {
      if (this.threatAssessmentService.update(editing.id, draft)) {
        this.closeModal();
      }
    } else {
      this.threatAssessmentService.create(draft);
      this.closeModal();
    }
  }

  // -- Deletion -------------------------------------------------------------

  /** Deletes the pending assessment, surfacing persist failures inline. */
  confirmPendingDeletion(): void {
    const assessment = this.pendingDeletion();
    if (!assessment) {
      return;
    }
    const removed = this.threatAssessmentService.remove(assessment.id);
    // A false result means the record already vanished (or the write
    // failed); there is no dedicated i18n key for that rare case, so the
    // dialog simply closes and the list re-renders from the service.
    this.pendingDeletion.set(null);
    if (removed) {
      this.errorMessage.set(null);
    }
  }

  dismissError(): void {
    this.errorMessage.set(null);
  }
}
