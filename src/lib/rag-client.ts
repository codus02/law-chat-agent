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
export type AnswerResult = SearchResult & {
  answer: string;
  status:
    | 'answered'
    | 'needs_more_info'
    | 'insufficient_evidence'
    | 'evidence_only'
    | 'experimental_unverified';
  claims: { text: string; source_id: string; quote: string }[];
  follow_up_questions: string[];
  mode: 'context' | 'evidence' | 'sequence';
  verification: string;
  expert_validated: false;
  model: string | null;
};
type Options = {
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
async function post<T>(path: string, question: string, options: Options): Promise<T> {
  // Same-origin Next.js route forwards to the local Python API.
  const { baseUrl = '', signal, ...body } = options;
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, ...body }),
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new RagApiError(
      response.status,
      typeof payload?.detail === 'string'
        ? payload.detail
        : '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  if (!payload) throw new RagApiError(502, '답변을 읽지 못했어요. 다시 시도해 주세요.');
  return payload as T;
}
export const searchEvidence = (question: string, options: Options = {}) =>
  post<SearchResult>('/api/rag/search', question, options);
export const answerQuestion = (question: string, options: Options = {}) =>
  post<AnswerResult>('/api/rag/answer', question, options);
