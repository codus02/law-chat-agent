import type { Answer, ChatHistoryItem, ChatMessage } from '@/lib/chat';
import { LAW_COLLECTED_DATE } from '@/lib/site';

// 백엔드(RAG API) 연결 전까지 화면을 채우는 예시 데이터.
// 조문 인용은 data/raw/statutes/current/의 수집 원문과 같은 문장이다.

const LAW_ORIGIN = `국가법령정보센터 현행본 · ${LAW_COLLECTED_DATE} 수집`;

export const SAMPLE_ANSWER: Answer = {
  question: '카페에서 일주일에 5일, 하루 4시간씩 일하고 있어요. 주휴수당을 받을 수 있나요?',
  conclusion: '말씀하신 근무 조건이라면 주휴수당을 받을 수 있을 가능성이 높아요.',
  conclusionCitations: [1],
  conditions: [
    {
      text: '1주 소정근로시간 15시간 이상',
      detail: '하루 4시간 × 주 5일 = 주 20시간으로 충족해요.',
      status: 'met',
      citations: [2],
    },
    {
      text: '정해진 근무일을 모두 출근(개근)',
      detail: '아직 확인하지 못했어요.',
      status: 'unknown',
      citations: [3],
    },
  ],
  followUp: {
    question: '지난주에 정해진 근무일을 빠짐없이 출근하셨나요?',
    options: ['네, 모두 출근했어요', '결근한 날이 있어요', '잘 모르겠어요'],
  },
  nextSteps: [
    '받지 못했다면 근무표와 급여 내역(임금명세서·이체 내역)을 모아 두세요.',
    '사업주에게 먼저 요청하기 어렵다면 고용노동부 고객상담센터(1350)에 상담할 수 있어요.',
  ],
  sources: [
    {
      id: 1,
      title: '근로기준법 제55조 제1항',
      quote: '사용자는 근로자에게 1주에 평균 1회 이상의 유급휴일을 보장하여야 한다.',
      origin: LAW_ORIGIN,
    },
    {
      id: 2,
      title: '근로기준법 제18조 제3항',
      quote:
        '4주 동안(4주 미만으로 근로하는 경우에는 그 기간)을 평균하여 1주 동안의 소정근로시간이 15시간 미만인 근로자에 대하여는 제55조와 제60조를 적용하지 아니한다.',
      origin: LAW_ORIGIN,
    },
    {
      id: 3,
      title: '근로기준법 시행령 제30조 제1항',
      quote: '법 제55조제1항에 따른 유급휴일은 1주 동안의 소정근로일을 개근한 자에게 주어야 한다.',
      origin: LAW_ORIGIN,
    },
  ],
};

export const SAMPLE_HISTORY: ChatHistoryItem[] = [
  { id: 'weekly-holiday', title: '알바 주휴수당 조건', dateLabel: '오늘' },
  { id: 'severance', title: '퇴직금 계산 기준', dateLabel: '9월 12일' },
  { id: 'annual-leave', title: '연차 사용 촉진 문의', dateLabel: '9월 8일' },
];

export const INTRO_MESSAGE: ChatMessage = { id: 'intro', role: 'assistant', kind: 'intro' };

export const SAMPLE_CONVERSATION: ChatMessage[] = [
  INTRO_MESSAGE,
  { id: 'sample-question', role: 'user', text: SAMPLE_ANSWER.question },
  { id: 'sample-answer', role: 'assistant', kind: 'answer', answer: SAMPLE_ANSWER },
];
