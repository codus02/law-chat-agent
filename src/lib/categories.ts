/**
 * 상담 첫 화면의 문제 유형.
 * 긴 설문 대신 유형 하나를 고른 뒤 상황을 자유롭게 적고, 부족한 정보만 이어서 확인하는 흐름의 출발점이다.
 * topics는 data/FAQ/ 분야 폴더와의 대응이며, 이후 유형별 검색 범위 제한·사실 확인 질문에 쓸 수 있도록 남겨 둔다.
 */
export type CategoryId = 'wage' | 'hours' | 'contract' | 'dismissal' | 'leave' | 'other';

export type Category = {
  id: CategoryId;
  label: string;
  /** 유형 버튼 아래에 보여주는 대표 상황 */
  description: string;
  /** 대응하는 data/FAQ/ 분야 폴더. 비어 있으면 아직 FAQ 코퍼스가 없는 분야 */
  topics: string[];
  /** 입력창 placeholder */
  placeholder: string;
  /** 판단에 꼭 필요한 사실을 알려주는 입력 가이드 */
  hint: string;
  /** 눌러서 입력창에 바로 채울 수 있는 예시 문장 */
  examples: string[];
  /** 함께 적으면 추가 질문 없이 바로 판정하기 쉬운 항목. 누르면 입력창에 항목 이름이 들어간다 */
  checklist: string[];
};

export const CATEGORIES: Category[] = [
  {
    id: 'wage',
    label: '임금·수당',
    description: '월급 미지급, 최저임금, 주휴수당',
    topics: ['임금지급_체불', '최저임금', '주휴수당', '연장_야간_휴일근로수당'],
    placeholder: '예: 주 3일, 하루 6시간 일하는데 주휴수당을 못 받았어요.',
    hint: '받는 시급(또는 월급)과 주 며칠·하루 몇 시간 일하는지 함께 적으면 더 정확해요.',
    examples: [
      '주휴수당을 못 받았어요.',
      '시급이 최저임금보다 적은 것 같아요.',
      '월급을 제때 못 받았어요.',
    ],
    checklist: [
      '시급 또는 월급',
      '주 며칠·하루 몇 시간',
      '일한 기간',
      '직원 수',
      '무슨 일이 있었는지',
    ],
  },
  {
    id: 'hours',
    label: '근로시간·휴게시간',
    description: '쉬는 시간, 추가 근무',
    topics: ['근로시간_휴게'],
    placeholder: '예: 하루 6시간 일하는데 쉬는 시간이 없어요.',
    hint: '하루 근무시간과 실제로 쉰 시간을 함께 적으면 더 정확해요.',
    examples: [
      '하루 6시간 일하는데 쉬는 시간이 없어요.',
      '정해진 시간보다 늦게 끝나는 날이 많아요.',
    ],
    checklist: ['하루 근무시간', '실제로 쉰 시간', '주 며칠', '직원 수', '무슨 일이 있었는지'],
  },
  {
    id: 'contract',
    label: '근로계약',
    description: '계약서 미작성, 계약 내용',
    topics: [],
    placeholder: '예: 일한 지 한 달이 됐는데 계약서를 안 써 줘요.',
    hint: '계약서를 썼는지, 썼다면 어떤 내용이 문제인지 적어 주세요.',
    examples: ['근로계약서를 안 써 줘요.', '계약서 내용이 처음 말과 달라요.'],
    checklist: ['계약서를 썼는지', '계약 기간', '주 며칠·하루 몇 시간', '문제가 된 내용'],
  },
  {
    id: 'dismissal',
    label: '해고·퇴사',
    description: '갑작스러운 해고, 퇴사 후 정산',
    topics: ['해고_계약종료'],
    placeholder: '예: 어제 문자로 갑자기 내일부터 나오지 말라고 했어요.',
    hint: '일한 기간과 어떻게 전달받았는지(말·문자)를 함께 적으면 더 정확해요.',
    examples: ['갑자기 그만 나오라는 말을 들었어요.', '그만뒀는데 마지막 월급을 안 줘요.'],
    checklist: ['일한 기간', '언제·어떻게 통보받았는지', '직원 수', '못 받은 돈이 있는지'],
  },
  {
    id: 'leave',
    label: '휴일·휴가',
    description: '주휴일, 연차, 공휴일 근무',
    topics: [],
    placeholder: '예: 쉬는 날 없이 매일 출근하고 있어요.',
    hint: '주 며칠 일하는지, 쉬는 날이 있는지 함께 적으면 더 정확해요.',
    examples: ['쉬는 날 없이 매주 7일 일해요.', '공휴일에 일했는데 아무것도 못 받았어요.'],
    checklist: [
      '주 며칠·하루 몇 시간',
      '일한 기간',
      '직원 수',
      '쉬는 날·휴가에 무슨 일이 있었는지',
    ],
  },
  {
    id: 'other',
    label: '기타·잘 모르겠어요',
    description: '어떤 유형인지 몰라도 괜찮아요',
    topics: [],
    placeholder: '지금 겪는 상황을 적어 주세요',
    hint: '언제부터, 주 며칠·하루 몇 시간 일했는지 함께 적으면 더 정확해요.',
    examples: [],
    checklist: ['나이(만 18세 미만인지)', '일한 기간', '직원 수', '무슨 일이 있었는지'],
  },
];

export const OTHER_CATEGORY = CATEGORIES[CATEGORIES.length - 1];

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && CATEGORIES.some((category) => category.id === value);
}

export function findCategory(id: CategoryId | null | undefined): Category | null {
  return CATEGORIES.find((category) => category.id === id) ?? null;
}

/** data/FAQ/ 분야 폴더 이름으로 상담 유형을 찾는다. 홈의 상황 칩을 유형과 연결할 때 쓴다. */
export function categoryForTopic(topic: string): Category {
  return CATEGORIES.find((category) => category.topics.includes(topic)) ?? OTHER_CATEGORY;
}
