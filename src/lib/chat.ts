/**
 * 상담 답변은 적법·권리침해 여부 / 법적 근거 / 대응 방법으로 구분한다.
 * 추가 확인 질문과 원문 출처를 함께 보여준다.
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

import type { Category, CategoryId } from './categories';
import type { IssueId } from './intake';
import type { AnswerResult, JudgeAnswer, JudgeResult } from './rag-client';

export type ChatMessage =
  | { id: string; role: 'user'; text: string; category?: CategoryId }
  /** 첫 화면: 상담 유형 선택 */
  | { id: string; role: 'assistant'; kind: 'intro' }
  /** 유형을 고른 뒤 상황을 자유롭게 적도록 안내 */
  | { id: string; role: 'assistant'; kind: 'category-prompt'; category: Category }
  /** 질문만으로 점검할 쟁점이 하나로 정해지지 않을 때 고르게 한다 */
  | {
      id: string;
      role: 'assistant';
      kind: 'issue-pick';
      question: string;
      category: CategoryId;
      issues: IssueId[];
      chosen?: IssueId;
    }
  /** 사실 확인 점검: 부족한 값만 묻고, 확인된 값으로 판정한다 */
  | {
      id: string;
      role: 'assistant';
      kind: 'fact-check';
      question: string;
      category: CategoryId;
      issue: IssueId;
    }
  /** 판정 전에 결론을 바꿀 수 있는 사실을 한 번만 묻는다 */
  | {
      id: string;
      role: 'assistant';
      kind: 'follow-up';
      question: string;
      category: CategoryId;
      questions: string[];
      submitted?: boolean;
    }
  /** 최종 판정: 항상 침해 또는 침해 아님 */
  | { id: string; role: 'assistant'; kind: 'judge-answer'; result: JudgeResult }
  | { id: string; role: 'assistant'; kind: 'answer'; answer: Answer }
  | { id: string; role: 'assistant'; kind: 'rag-answer'; answer: AnswerResult }
  | {
      id: string;
      role: 'assistant';
      kind: 'error';
      text: string;
      question: string;
      category?: CategoryId;
      /** 추가 질문에 답한 뒤 실패했다면 그 답을 다시 보낸다 */
      answers?: JudgeAnswer[];
      final?: boolean;
    }
  | { id: string; role: 'assistant'; kind: 'pending' };

export type ChatHistoryItem = { id: string; title: string; dateLabel: string };

export const MAX_MESSAGE_LENGTH = 1000;
