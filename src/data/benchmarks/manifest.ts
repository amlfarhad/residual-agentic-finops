import { BenchmarkDomain } from '../../types/telemetry';

export interface BenchmarkCorpusDescriptor {
  id: 'tau-bench' | 'swe-bench' | 'combined' | 'custom';
  name: string;
  shortName: string;
  citation: string;
  domainTags: BenchmarkDomain[];
  primarySocCode: string;
  description: string;
  traceCountLabel: string;
  provenanceNote: string;
}

export const BENCHMARK_MANIFEST: BenchmarkCorpusDescriptor[] = [
  {
    id: 'tau-bench',
    name: 'TAU-bench · Airline & Retail Multi-Turn Support',
    shortName: 'TAU-bench Support',
    citation: 'Yao et al. (2024) · Sierra Research τ-bench',
    domainTags: ['airline-support', 'retail-support'],
    primarySocCode: '43-4051',
    description:
      'Authentic multi-turn tool-use customer support trajectories covering flight modifications, baggage policy waivers, retail returns/exchanges, and human escalations.',
    traceCountLabel: '8 Audited Trajectories',
    provenanceNote:
      'Normalized from τ-bench function-calling transcripts benchmarked against BLS SOC 43-4051 ($27.40/hr loaded).',
  },
  {
    id: 'swe-bench',
    name: 'SWE-bench Verified · Autonomous Engineering Runs',
    shortName: 'SWE-bench Dev',
    citation: 'Jimenez et al. (2024) · Princeton NLP SWE-bench',
    domainTags: ['software-engineering'],
    primarySocCode: '15-1252',
    description:
      'Real repository issue-resolution traces (Django, Scikit-Learn, SymPy, Pytest, Requests, Matplotlib) exposing compiler/pytest retry loops and context thrashing.',
    traceCountLabel: '6 Audited Trajectories',
    provenanceNote:
      'Normalized from OpenTelemetry GenAI agent spans benchmarked against BLS SOC 15-1252 ($88.17/hr loaded).',
  },
  {
    id: 'combined',
    name: 'Enterprise Blended Corpus · CX + Autonomous Dev',
    shortName: 'Blended Portfolio',
    citation: 'TAU-bench + SWE-bench Consolidated Ledger',
    domainTags: ['airline-support', 'retail-support', 'software-engineering'],
    primarySocCode: '43-4051',
    description:
      'Cross-functional executive FinOps portfolio uniting high-volume CX automation and high-wage autonomous software engineering under unified unit economics.',
    traceCountLabel: '14 Audited Trajectories',
    provenanceNote:
      'Full cross-domain settlement ledger reconciling LLM rate cards, BLS loaded labor, and contractual SLA accruals.',
  },
];
