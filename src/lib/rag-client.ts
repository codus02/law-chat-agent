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
/** 고정한 근거 조문이 현행 법령과 같은지 매일 확인한 결과 */
export type LawStatus = {
  pinned_as_of: string;
  valid_from: string;
  verified_through: string;
  today: string;
  today_supported: boolean;
  last_checked_at: string | null;
  last_result: 'unchanged' | 'changed' | 'failed' | 'never_checked';
  changed: string[];
};
export type IntakeResult = {
  question: string;
  issue: IssueId;
  facts: Facts;
  /** 점검 기준일(기본은 오늘). 규칙은 law_status의 확인 범위 안의 날짜만 판정한다. */
  as_of_date: string;
  law_status?: LawStatus;
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

/** 판정(/api/rag/judge): 모든 질문을 침해/침해 아님으로 끝낸다. 부족하면 추가 질문을 한 번 돌려준다. */
export type JudgeAnswer = { question: string; answer: string };
export type JudgeResult = {
  status: 'needs_follow_up' | 'judged';
  verdict: '침해' | '침해 아님' | null;
  questions: string[];
  sections?: AnswerSection[];
  sources?: { id: string; title: string; url: string }[];
  /** "모름"으로 답한 질문. 판정은 그 사실 없이 내린 것이다. */
  assumed_unknowns?: string[];
  /** rule: 확인한 사실로 규칙이 판정, model: 미세조정 Gemma가 판정 */
  origin?: 'rule' | 'model';
  /** 규칙 판정에서 글에 없어 기본값으로 본 전제(예: 성인 근로자) */
  assumptions?: string[];
  /** 규칙 판정이 본 범위(예: 최저임금 액수만). 이 범위 밖의 쟁점은 판단하지 않았다. */
  scope?: string;
  model: string;
  model_calls: number;
  reference_date: string;
  elapsed_ms: number;
};

export const requestJudge = (
  body: { question: string; category?: CategoryId; answers?: JudgeAnswer[]; final?: boolean },
  signal?: AbortSignal,
) => {
  const { category, ...rest } = body;
  const apiCategory = category === 'dismissal' ? 'termination' : category;
  return postJson<JudgeResult>(
    '/api/rag/judge',
    { ...rest, ...(apiCategory ? { category: apiCategory } : {}) },
    signal,
  );
};

export type DeepReadResult = {
  status: 'skipped' | 'failed' | 'done';
  facts: Facts;
  /** 필드별로 모델이 가리킨 원문 구절. 값은 규칙이 이 구절에서 다시 읽은 것이다. */
  evidence: Record<string, string>;
  seconds: number;
  reason?: string;
};

/** 긴 글(150자 초과)을 로컬 LLM으로 한 번 더 읽어 빈 칸 후보를 받는다. 판정은 하지 않는다. */
export const requestDeepRead = (question: string, signal?: AbortSignal) =>
  postJson<DeepReadResult>('/api/rag/intake-deep', { question }, signal);

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
