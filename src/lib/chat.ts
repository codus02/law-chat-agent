/**
 * 상담 답변은 결론 → 적용 조건 → 근거 → 확인 질문·다음 행동 순서의 결과 카드로 보여준다.
 * (plot.md「차별화 후보」의 결과 카드 구조)
 */
export type AnswerSource = {
  id: number;
  title: string;
  /** 수집한 법령 원문을 그대로 인용한다. */
  quote: string;
  origin: string;
};

export type AnswerCondition = {
  text: string;
  detail?: string;
  /** met: 사용자가 말한 사실로 충족 확인, unknown: 추가 확인 필요 */
  status: 'met' | 'unknown';
  citations: number[];
};

export type FollowUp = {
  question: string;
  options: string[];
};

export type Answer = {
  question: string;
  conclusion: string;
  conclusionCitations: number[];
  conditions: AnswerCondition[];
  followUp?: FollowUp;
  nextSteps: string[];
  sources: AnswerSource[];
};

import type { AnswerResult } from './rag-client';

export type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; kind: 'intro' }
  | { id: string; role: 'assistant'; kind: 'answer'; answer: Answer }
  | { id: string; role: 'assistant'; kind: 'rag-answer'; answer: AnswerResult }
  | { id: string; role: 'assistant'; kind: 'error'; text: string; question: string }
  | { id: string; role: 'assistant'; kind: 'pending' };

export type ChatHistoryItem = { id: string; title: string; dateLabel: string };

export const MAX_MESSAGE_LENGTH = 1000;
