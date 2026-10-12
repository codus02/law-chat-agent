import type { CategoryId } from './categories';
import type { IssueId } from './intake';

export type Retrieval = 'dense' | 'bm25' | 'hybrid';
export type Source = {
  id: string;
  document_id: string;
  chunk_id: string;
  title: string;
  url: string;
  excerpt: string;
  source_type: string;
  as_of_date: string;
  effective_from: string | null;
  effective_to: string | null;
  score: number;
  retrieval_weight: number;
  retrieval_method: string;
  adjustments: string[];
  application_scope: string;
};
export type SearchResult = {
  question: string;
  as_of_date: string;
  corpus_version: string;
  retrieval: Retrieval;
  sources: Source[];
  supporting_sources?: Source[];
  elapsed_ms: number;
};
export type AnswerSection = { key: 'judgment' | 'basis' | 'action'; title: string; text: string };
export type AnswerResult = SearchResult & {
  answer: string;
  sections: AnswerSection[];
  experimental_answer?: string;
  status:
    | 'answered'
    | 'needs_more_info'
    | 'insufficient_evidence'
    | 'evidence_only'
    | 'experimental_unverified';
  verdict?: '침해' | '침해 아님' | null;
  claims: {
    section: 'judgment' | 'basis' | 'action';
    text: string;
    source_id: string;
    quote: string;
  }[];
  follow_up_questions: string[];
  mode: 'context' | 'evidence' | 'sequence';
  verification: string;
  expert_validated: false;
  model: string | null;
};

/** 사실 확인 점검(/api/rag/intake)의 값 종류. 날짜·선택형은 문자열, 모르면 null */
export type FactValue = string | number | boolean | null;
export type Facts = Record<string, FactValue>;
export type IntakeField = {
  key: string;
  label: string;
  type: 'date' | 'boolean' | 'integer' | 'number' | 'choice';
  value: FactValue;
};
export type IntakeResult = {
  question: string;
  issue: IssueId;
  facts: Facts;
  as_of_date: string;
  fields: IntakeField[];
  missing_fields: string[];
  confirmed: boolean;
  verdict: '침해' | '침해 아님' | null;
  /** 이 쟁점이 확인하는 범위 */
  scope: string;
  /** needs_confirmation: 값 확인 대기, needs_more_info: 빈 값, scope_review: 규칙 범위 밖, checked: 판정 완료 */
  status: 'needs_confirmation' | 'needs_more_info' | 'scope_review' | 'checked';
  sources: { id: string; title: string; url: string }[];
  sections: AnswerSection[];
  reason: string | null;
  notice: string;
  canonical_facts?: string;
  model_called: boolean;
  expert_validated: false;
  elapsed_ms: number;
};

type Options = {
  category?: CategoryId;
  baseUrl?: string;
  top_k?: number;
  retrieval?: Retrieval;
  as_of_date?: string;
  signal?: AbortSignal;
  mode?: 'context' | 'evidence' | 'sequence';
  model?: string;
};
export class RagApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  // Same-origin Next.js route forwards to the local Python API.
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new RagApiError(
      response.status,
      typeof payload?.detail === 'string'
        ? payload.detail
        : response.status === 422
          ? '입력한 값의 형식을 확인해 주세요. 숫자 칸에는 숫자만 적어요.'
          : '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  if (!payload) throw new RagApiError(502, '답변을 읽지 못했어요. 다시 시도해 주세요.');
  return payload as T;
}

function post<T>(path: string, question: string, options: Options): Promise<T> {
  const { baseUrl = '', signal, category, ...body } = options;
  // UI calls this dismissal; the API uses termination for dismissal and resignation.
  const apiCategory = category === 'dismissal' ? 'termination' : category;
  return postJson<T>(
    `${baseUrl.replace(/\/$/, '')}${path}`,
    { question, ...body, ...(apiCategory ? { category: apiCategory } : {}) },
    signal,
  );
}

export const searchEvidence = (question: string, options: Options = {}) =>
  post<SearchResult>('/api/rag/search', question, options);
export const answerQuestion = (question: string, options: Options = {}) =>
  post<AnswerResult>('/api/rag/answer', question, options);

/**
 * 사실 확인 점검. confirmed=false면 질문에서 추정한 값과 확인 항목만 돌려주고,
 * confirmed=true면 사용자가 확인한 값으로만 판정한다. 백엔드는 모르는 값(null)을 추정하지 않는다.
 */
export const requestIntake = (
  body: { question: string; issue: IssueId; facts: Facts; confirmed: boolean },
  signal?: AbortSignal,
) => {
  // 백엔드 스키마는 알 수 없는 키를 거부하므로 null은 빼고 보낸다.
  const facts = Object.fromEntries(
    Object.entries(body.facts).filter(([, value]) => value !== null && value !== undefined),
  );
  return postJson<IntakeResult>('/api/rag/intake', { ...body, facts }, signal);
};
