import { Category } from '../models/category.model';
import { Contact } from '../models/contact.model';
import { ContactName } from '../models/contact-name.model';
import { Company } from '../models/company.model';
import { CrmCase } from '../models/phase2/case.model';
import { Escalation } from '../models/phase2/escalation.model';
import { LegalElementsBundle } from '../models/phase2/legal-elements.model';
import { ThreatAssessment, ThreatSectionEntry } from '../models/phase2/threat-assessment.model';
import { generateId, nowIso } from '../utils/id';

/** Everything the app seeds on first launch (or after a schema reset). */
export interface SeedData {
  categories: Category[];
  companies: Company[];
  contacts: Contact[];
  cases: CrmCase[];
  escalations: Escalation[];
  threatAssessments: ThreatAssessment[];
  legalElementsBundles: LegalElementsBundle[];
}

/**
 * Builds a rich, era-consistent sample dataset that exercises every
 * model feature: both name modes, all cultural orders, middle names,
 * every HR status, company-active/inactive states, favorites, and
 * companies across all sizes/structures/sectors with CEO links back to
 * their contact rows.
 */
export function buildSeedData(): SeedData {
  const base = nowIso();

  // ── Categories (spec pre-seeds: Students, Partners, Clients, External Speakers) ──
  const students: Category = {
    id: generateId(),
    name: { en: 'Students', fr: 'Étudiants' },
    color: '#2563eb',
    createdAt: base,
  };
  const partners: Category = {
    id: generateId(),
    name: { en: 'Partners', fr: 'Partenaires' },
    color: '#d97706',
    createdAt: base,
  };
  const clients: Category = {
    id: generateId(),
    name: { en: 'Clients', fr: 'Clients' },
    color: '#059669',
    createdAt: base,
  };
  const speakers: Category = {
    id: generateId(),
    name: { en: 'External Speakers', fr: 'Intervenants externes' },
    color: '#7c3aed',
    createdAt: base,
  };

  // ── Contacts first: companies reference their CEO contact ──
  const contact = (c: Omit<Contact, 'addedAt' | 'updatedAt'>, addedBeforeDays: number): Contact => {
    // Spread additions over ~30 days so "recent additions" and date sorts are meaningful.
    const addedAt = new Date(Date.now() - addedBeforeDays * 86_400_000).toISOString();
    return { ...c, addedAt, updatedAt: addedAt };
  };

  const claire = contact(
    {
      id: generateId(),
      name: {
        mode: 'structured',
        rawFullName: '',
        shortTitle: 'Me.',
        longTitle: 'Maître',
        firstName: 'Claire',
        middleNames: ['Élodie'],
        lastName: 'Duval-Fontaine',
        culturalOrder: 'western',
      },
      jobTitle: 'CEO & Founder',
      email: 'claire.duval@novapart.example.com',
      phone: '+33 1 44 55 66 77',
      city: 'Paris',
      companyId: null, // filled after the company rows are created
      isCompanyActive: true,
      hrProcessStatus: 'Active',
      categoryId: partners.id,
      favorite: true,
      notes: 'Founder of NovaPart. Prefers email before 10 am.',
      profileImageUrl: '',
      profileImageAlt: 'Portrait of Maître Claire Élodie Duval-Fontaine',
    },
    29,
  );

  const hiroshi = contact(
    {
      id: generateId(),
      name: {
        mode: 'structured',
        rawFullName: '',
        shortTitle: 'Dr.',
        longTitle: 'Doctor',
        firstName: 'Hiroshi',
        middleNames: ['Kenji'],
        lastName: 'Tanaka',
        culturalOrder: 'eastern', // renders: Tanaka Kenji Hiroshi, pref. Dr.
      },
      jobTitle: 'Chief Research Officer',
      email: 'h.tanaka@kaze-dynamics.example.jp',
      phone: '+81 3 4567 8910',
      city: 'Tokyo',
      companyId: null,
      isCompanyActive: true,
      hrProcessStatus: 'Active',
      categoryId: clients.id,
      favorite: true,
      notes: 'Eastern naming order — keep the family name first in all listings.',
      profileImageUrl: '',
      profileImageAlt: 'Portrait of Doctor Hiroshi Kenji Tanaka',
    },
    24,
  );

  const julien = contact(
    {
      id: generateId(),
      name: {
        mode: 'structured',
        rawFullName: 'Julien Marie Moreau',
        shortTitle: 'Mr.',
        longTitle: '',
        firstName: 'Julien',
        middleNames: ['Marie'],
        lastName: 'Moreau',
        culturalOrder: 'western',
      },
      jobTitle: 'CTO',
      email: 'j.moreau@techwave.example.com',
      phone: '+33 6 12 34 56 78',
      city: 'Lyon',
      companyId: null,
      isCompanyActive: true,
      hrProcessStatus: 'Active',
      categoryId: partners.id,
      favorite: false,
      notes: 'Met at the Paris tech job fair.',
      profileImageUrl: '',
      profileImageAlt: 'Portrait of Mr Julien Marie Moreau',
    },
    19,
  );

  const amina = contact(
    {
      id: generateId(),
      name: { mode: 'full', rawFullName: 'Amina Diallo', ...emptyNameTokens() },
      jobTitle: 'Student',
      email: 'amina.diallo@example.edu',
      phone: '+33 6 98 76 54 32',
      city: 'Lille',
      companyId: null,
      isCompanyActive: false,
      hrProcessStatus: 'Pending',
      categoryId: students.id,
      favorite: true,
      notes: 'Full-stack specialization, graduating in 2026.',
      profileImageUrl: '',
      profileImageAlt: 'Portrait of Amina Diallo',
    },
    14,
  );

  const rajesh = contact(
    {
      id: generateId(),
      name: {
        mode: 'structured',
        rawFullName: '',
        shortTitle: '',
        longTitle: 'Monsieur',
        firstName: 'Rajesh',
        middleNames: ['Anand', 'Venkat'],
        lastName: 'Iyer',
        culturalOrder: 'western',
      },
      jobTitle: 'Logistics Director',
      email: 'rajesh.iyer@meridian-freight.example.com',
      phone: '+91 44 4002 8891',
      city: 'Chennai',
      companyId: null,
      isCompanyActive: true,
      hrProcessStatus: 'Active',
      categoryId: partners.id,
      favorite: false,
      notes: 'Two middle tokens to showcase multi-name rendering.',
      profileImageUrl: '',
      profileImageAlt: 'Portrait of Monsieur Rajesh Anand Venkat Iyer',
    },
    11,
  );

  const margarethe = contact(
    {
      id: generateId(),
      name: { mode: 'full', rawFullName: 'Margarethe Zeller', ...emptyNameTokens() },
      jobTitle: 'Head of Clinical Operations',
      email: 'm.zeller@santoria.example.de',
      phone: '+49 89 7766 5544',
      city: 'Munich',
      companyId: null,
      isCompanyActive: true,
      hrProcessStatus: 'Active',
      categoryId: clients.id,
      favorite: false,
      notes: 'Introduced at the Nuremberg health congress.',
      profileImageUrl: '',
      profileImageAlt: 'Portrait of Margarethe Zeller',
    },
    8,
  );

  const victor = contact(
    {
      id: generateId(),
      name: {
        mode: 'structured',
        rawFullName: '',
        shortTitle: 'Mr.',
        longTitle: '',
        firstName: 'Victor',
        middleNames: [],
        lastName: 'Okafor',
        culturalOrder: 'western',
      },
      jobTitle: 'Site Manager',
      email: 'v.okafor@briquetal.example.com',
      phone: '+33 4 91 23 45 67',
      city: 'Marseille',
      companyId: null,
      // Left the company: inactive badge, and the CEO link must stay consistent.
      isCompanyActive: false,
      hrProcessStatus: 'Inactive',
      categoryId: partners.id,
      favorite: false,
      notes: 'Departed the company in spring; keep for archival follow-up.',
      profileImageUrl: '',
      profileImageAlt: 'Portrait of Mr Victor Okafor',
    },
    6,
  );

  const lea = contact(
    {
      id: generateId(),
      name: {
        mode: 'structured',
        rawFullName: '',
        shortTitle: 'Me.',
        longTitle: 'Maître',
        firstName: 'Léa',
        middleNames: [],
        lastName: 'Marchand',
        culturalOrder: 'western',
      },
      jobTitle: 'In-house Counsel',
      email: 'lea.marchand@novapart.example.com',
      phone: '+33 1 44 55 66 78',
      city: 'Paris',
      companyId: null,
      isCompanyActive: true,
      hrProcessStatus: 'Active',
      categoryId: partners.id,
      favorite: false,
      notes: 'Legal contact at NovaPart for contract reviews.',
      profileImageUrl: '',
      profileImageAlt: 'Portrait of Maître Léa Marchand',
    },
    4,
  );

  const tomas = contact(
    {
      id: generateId(),
      name: { mode: 'full', rawFullName: 'Tomás Etxebarria', ...emptyNameTokens() },
      jobTitle: 'Guest Lecturer',
      email: 't.etxebarria@guest.example.com',
      phone: '+34 91 876 5432',
      city: 'Madrid',
      companyId: null,
      isCompanyActive: false,
      hrProcessStatus: 'Archived',
      categoryId: speakers.id,
      favorite: false,
      notes: 'Delivered the 2025 supply-chain masterclass.',
      profileImageUrl: '',
      profileImageAlt: 'Portrait of Tomás Etxebarria',
    },
    2,
  );

  // ── Companies (CEO contactId reverse-links, contacts carry companyId) ──
  const novapart: Company = {
    id: generateId(),
    name: 'NovaPart',
    size: 'Medium Enterprise',
    businessStructure: 'Limited Liability Company',
    sector: 'Technology',
    contactId: claire.id, // CEO
    createdAt: base,
  };
  const kaze: Company = {
    id: generateId(),
    name: 'Kaze Dynamics',
    size: 'Large Enterprise',
    businessStructure: 'Corporation',
    sector: 'Technology',
    contactId: hiroshi.id,
    createdAt: base,
  };
  const techwave: Company = {
    id: generateId(),
    name: 'TechWave',
    size: 'Small Enterprise',
    businessStructure: 'Partnership',
    sector: 'Technology',
    contactId: julien.id,
    createdAt: base,
  };
  const meridian: Company = {
    id: generateId(),
    name: 'Meridian Freight',
    size: 'Major Enterprise',
    businessStructure: 'Corporation',
    sector: 'Transportation',
    contactId: rajesh.id,
    createdAt: base,
  };
  const santoria: Company = {
    id: generateId(),
    name: 'Santoria Health',
    size: 'Very Large Enterprise',
    businessStructure: 'Corporation',
    sector: 'Healthcare',
    contactId: margarethe.id,
    createdAt: base,
  };
  const briquetal: Company = {
    id: generateId(),
    name: 'Briquetal Construction',
    size: 'Micro Enterprise',
    businessStructure: 'Sole Proprietorship',
    sector: 'Construction',
    contactId: victor.id,
    createdAt: base,
  };
  const atelier: Company = {
    id: generateId(),
    name: 'Atelier Lemaitre',
    size: 'Self-Employed Enterprise',
    businessStructure: 'Individual',
    sector: 'Manufacturing',
    contactId: null, // no recorded CEO yet
    createdAt: base,
  };

  // Wire the contacts to their companies now that ids exist.
  const withCompany = (c: Contact, companyId: string | null): Contact => ({ ...c, companyId });
  const contacts: Contact[] = [
    withCompany(claire, novapart.id),
    withCompany(hiroshi, kaze.id),
    withCompany(julien, techwave.id),
    amina, // student, no company
    withCompany(rajesh, meridian.id),
    withCompany(margarethe, santoria.id),
    withCompany(victor, briquetal.id),
    withCompany(lea, novapart.id),
    tomas, // archived guest speaker, no company
  ];

  const companies: Company[] = [novapart, kaze, techwave, meridian, santoria, briquetal, atelier];

  // ── Phase 2 (ERM): cases, escalations, threat assessments, legal elements ──
  const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString();
  const caseRow = (
    c: Omit<CrmCase, 'createdAt' | 'updatedAt'>,
    createdBeforeDays: number,
  ): CrmCase => {
    const createdAt = daysAgo(createdBeforeDays);
    return { ...c, createdAt, updatedAt: createdAt };
  };

  const caseOvertimeIrritant = caseRow(
    {
      id: generateId(),
      kind: 'irritant',
      title: 'Recurring meetings scheduled outside working hours',
      description:
        'Weekly syncs have been moved to 7:30 pm three weeks in a row, cutting into personal ' +
        'time. Lea flagged it; Victor considers it "the only workable slot".',
      contactIds: [lea.id, victor.id],
      companyId: novapart.id,
      status: 'open',
    },
    6,
  );

  const caseAuthorshipConflict = caseRow(
    {
      id: generateId(),
      kind: 'conflict',
      title: 'Dispute over authorship credit in the joint publication',
      description:
        'Julien claims Hiroshi omitted his contribution from the paper credits; Hiroshi ' +
        'contests the extent of the reviewed material. Authorship rules are unclear.',
      contactIds: [julien.id, hiroshi.id],
      companyId: techwave.id,
      status: 'observed',
    },
    14,
  );

  const caseOvertimeComplaint = caseRow(
    {
      id: generateId(),
      kind: 'complaint',
      title: 'Formal complaint about uncompensated overtime',
      description:
        'Rajesh filed a written complaint covering 32 hours of unpaid overtime during the ' +
        'Q2 migration freeze, with timesheet extracts attached.',
      contactIds: [rajesh.id],
      companyId: meridian.id,
      status: 'open',
    },
    9,
  );

  const caseRestructuringMediation = caseRow(
    {
      id: generateId(),
      kind: 'mediation',
      title: 'Mediation after the team restructuring of the Paris hub',
      description:
        'Facilitated mediation between Claire and Lea about role clarity and reporting lines ' +
        'after the restructuring. It concluded with a written agreement on meeting cadence.',
      contactIds: [claire.id, lea.id],
      companyId: santoria.id,
      status: 'resolved',
    },
    21,
  );

  const escalations: Escalation[] = [
    {
      id: generateId(),
      sourceContactId: julien.id,
      targetContactId: hiroshi.id,
      sourceLevel: 'superior',
      targetLevel: 'management',
      purpose: 'resolution',
      mediationCaseId: caseAuthorshipConflict.id,
      notes: 'Authorship dispute raised one level up after two failed bilateral talks.',
      createdAt: daysAgo(12),
    },
    {
      id: generateId(),
      sourceContactId: rajesh.id,
      targetContactId: margarethe.id,
      sourceLevel: 'management',
      targetLevel: 'hr',
      purpose: 'protection',
      mediationCaseId: caseOvertimeComplaint.id,
      notes: 'HR involvement requested to guarantee the overtime claim is handled formally.',
      createdAt: daysAgo(7),
    },
  ];

  // DCJS-inspired sections, exercised end-to-end on one assessment.
  const threatSection = (section: ThreatSectionEntry['section'], findings: string, severity: ThreatSectionEntry['severity']): ThreatSectionEntry => ({
    section,
    findings,
    severity,
  });
  const threatAssessments: ThreatAssessment[] = [
    {
      id: generateId(),
      contactId: victor.id,
      companyId: briquetal.id,
      sections: [
        threatSection(
          'identity',
          'Victor, site manager,  well known internally; no prior incidents.',
          'unknown',
        ),
        threatSection('motives', 'Resists workload rebalancing; economic pressure cited.', 'low'),
        threatSection('grievance', 'Feels unrecognized after the reorganization.', 'moderate'),
        threatSection('targeting', 'Named no specific target; frustration is general.', 'low'),
        threatSection('capability', 'Standard site access; no relevant skills declared.', 'unknown'),
        threatSection('breach-attempts', 'Repeatedly bypassed the scheduling process.', 'low'),
        threatSection('direct-leakage', 'None observed.', 'unknown'),
        threatSection('risk-attitude', 'Prefers negotiation; escalates verbally first.', 'low'),
        threatSection(
          'mitigation',
          'Monthly check-ins agreed with HR; workload review scheduled.',
          'low',
        ),
        threatSection('final-classification', ' Irritant pattern only,  no threat indicators.', 'low'),
      ],
      overallThreat: 'minor',
      createdAt: daysAgo(5),
    },
  ];

  const legalElementsBundles: LegalElementsBundle[] = [
    {
      id: generateId(),
      contactId: claire.id,
      companyId: novapart.id,
      references: [
        {
          id: generateId(),
          kind: 'contracts',
          label: 'CEO employment contract — 2023 revision, clause 8.2 (notice period)',
          location: 'Contracts archive / NovaPart / Executives / 2023',
          externalUrl: null,
        },
        {
          id: generateId(),
          kind: 'legal-work-code',
          label: 'Labour Code, article L1221-1 — employment contract definition',
          location: 'Légifrance',
          externalUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006900783',
        },
        {
          id: generateId(),
          kind: 'internal-structural-elements',
          label: 'NovaPart internal policy — remote-work charter v3',
          location: 'Intranet / Policies / People',
          externalUrl: null,
        },
        {
          id: generateId(),
          kind: 'further-legal-documentation',
          label: 'Restructuring information-consultation minutes (CSE, March)',
          location: 'Legal documentation / NovaPart / CSE 2026',
          externalUrl: null,
        },
      ],
      createdAt: daysAgo(11),
    },
  ];

  return {
    categories: [students, partners, clients, speakers],
    companies,
    contacts,
    cases: [
      caseOvertimeIrritant,
      caseAuthorshipConflict,
      caseOvertimeComplaint,
      caseRestructuringMediation,
    ],
    escalations,
    threatAssessments,
    legalElementsBundles,
  };
}

/** Token fields for a 'full'-mode name, keeping the object well-formed. */
function emptyNameTokens(): Pick<
  ContactName,
  'shortTitle' | 'longTitle' | 'firstName' | 'middleNames' | 'lastName' | 'culturalOrder'
> {
  return {
    shortTitle: '',
    longTitle: '',
    firstName: '',
    middleNames: [],
    lastName: '',
    culturalOrder: 'western',
  };
}
