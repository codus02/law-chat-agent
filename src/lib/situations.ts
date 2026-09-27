/**
 * 홈의 일상어 상황 칩.
 * 법률 용어 대신 알바생이 실제로 쓰는 말로 적고, 코퍼스·평가셋이 다루는 FAQ 6개 분야(data/FAQ/)와
 * 하나씩 대응시켜 답변 가능한 범위 안에서 상담을 시작하도록 돕는다.
 * hint는 그 분야에서 판단에 꼭 필요한 사실을 알려주는 입력 가이드다.
 */
export type Situation = {
  id: string;
  /** 대응하는 data/FAQ/ 분야 폴더 */
  topic: string;
  label: string;
  starter: string;
  hint: string;
};

export const SITUATIONS: Situation[] = [
  {
    id: 'weekly-holiday',
    topic: '주휴수당',
    label: '주휴수당을 못 받았어요',
    starter: '주휴수당을 못 받았어요. ',
    hint: '주 며칠, 하루 몇 시간 일하는지 적어 주세요.',
  },
  {
    id: 'minimum-wage',
    topic: '최저임금',
    label: '시급이 최저임금보다 적어요',
    starter: '시급이 최저임금보다 적은 것 같아요. ',
    hint: '받는 시급(또는 월급)과 하루·주 근무시간을 적어 주세요.',
  },
  {
    id: 'unpaid-wage',
    topic: '임금지급_체불',
    label: '월급이 밀렸어요',
    starter: '월급을 제때 못 받았어요. ',
    hint: '받지 못한 기간과 금액, 지금도 일하는지 적어 주세요.',
  },
  {
    id: 'break-time',
    topic: '근로시간_휴게',
    label: '쉬는 시간이 없어요',
    starter: '일하는 동안 쉬는 시간이 없어요. ',
    hint: '하루 근무시간과 실제로 쉰 시간을 적어 주세요.',
  },
  {
    id: 'night-weekend',
    topic: '연장_야간_휴일근로수당',
    label: '야간·주말 수당이 없어요',
    starter: '밤이나 주말에 일했는데 수당을 더 받지 못했어요. ',
    hint: '일한 시간대와 가게 직원 수(5명 이상인지)를 적어 주세요.',
  },
  {
    id: 'dismissal',
    topic: '해고_계약종료',
    label: '갑자기 그만 나오래요',
    starter: '갑자기 그만 나오라는 말을 들었어요. ',
    hint: '일한 기간과 어떻게 전달받았는지(말·문자) 적어 주세요.',
  },
];

export const DEFAULT_HINT = '언제부터, 주 며칠·하루 몇 시간 일했는지 함께 적으면 더 정확해요.';
