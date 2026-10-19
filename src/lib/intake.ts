/**
 * 사실 확인 점검(rag/intake.py)과 채팅을 잇는 프런트 쪽 규칙.
 * - 상담 유형과 질문 문장으로 점검할 쟁점(issue)을 고른다. 확실하지 않으면 사용자에게 고르게 한다.
 * - 백엔드가 돌려준 확인 항목(fields)에 일상어 보조 설명을 붙인다.
 * 판정·근거·대응은 전부 백엔드 규칙이 만들고, 여기서는 문구와 흐름만 다룬다.
 */
import type { CategoryId } from './categories';

export type IssueId =
  | 'minimum_wage'
  | 'minimum_monthly'
  | 'wage_statement'
  | 'break'
  | 'weekly_holiday'
  | 'overtime_premium'
  | 'part_time_overtime'
  | 'fixed_term_duration'
  | 'written_terms'
  | 'dismissal_notice'
  | 'retirement_payment';

export type Issue = {
  id: IssueId;
  /** 쟁점 선택 칩과 카드 제목에 쓰는 일상어 이름 */
  label: string;
  /** 이 쟁점이 확인하는 범위를 한 줄로 */
  description: string;
  /** 질문 문장에서 이 쟁점을 추정하는 단서 */
  keywords: RegExp;
};

export const ISSUES: Record<IssueId, Issue> = {
  minimum_wage: {
    id: 'minimum_wage',
    label: '시급이 최저임금에 맞는지',
    description: '다른 수당 없이 받는 시급을 2026년 최저임금과 비교해요.',
    keywords: /최저\s*임금|시급|시간당|수습/,
  },
  minimum_monthly: {
    id: 'minimum_monthly',
    label: '월급이 최저임금에 맞는지',
    description: '주 40시간·유급주휴 8시간 기준의 월급(209시간 환산)을 비교해요.',
    keywords: /월급.{0,12}(최저|적|부족|모자|낮)|(최저|적|부족|모자|낮).{0,12}월급|209/,
  },
  wage_statement: {
    id: 'wage_statement',
    label: '임금명세서를 제대로 받았는지',
    description: '월급을 받을 때 명세서를 받았는지, 법정 항목이 다 있는지 확인해요.',
    keywords: /명세서|급여\s*명세|임금\s*내역/,
  },
  break: {
    id: 'break',
    label: '휴게시간을 제대로 받았는지',
    description: '하루 실제 근로 4~8시간일 때 자유롭게 쉬는 시간이 충분했는지 확인해요.',
    keywords: /휴게|쉬는\s*시간|쉬지|못\s*쉬|휴식|밥\s*먹을|쉴\s*(틈|시간|수)/,
  },
  weekly_holiday: {
    id: 'weekly_holiday',
    label: '유급 주휴일(주휴수당)이 있어야 하는지',
    description: '4주 평균 주 15시간 이상이면 주 1회 유급휴일이 있어야 해요.',
    keywords: /주휴|유급\s*휴일|주휴일|주급.{0,6}휴일/,
  },
  overtime_premium: {
    id: 'overtime_premium',
    label: '연장근로 수당(50% 가산)을 받았는지',
    description: '상시 5인 이상 사업장에서 평일 법정근로시간을 넘긴 시간의 가산임금을 확인해요.',
    keywords: /연장|야근|추가\s*근무|초과\s*근무|가산|1\.5배|더\s*일(했|하)|늦게\s*끝/,
  },
  part_time_overtime: {
    id: 'part_time_overtime',
    label: '단시간 근로자의 초과근무 조건을 지켰는지',
    description: '계약한 시간보다 더 일할 때 동의·주 12시간 한도·가산임금을 확인해요.',
    keywords: /단시간|정해진\s*시간보다|계약(한|된)\s*시간보다|소정근로시간.{0,8}초과|더\s*오래/,
  },
  fixed_term_duration: {
    id: 'fixed_term_duration',
    label: '계약 기간이 2년을 넘었는지',
    description: '기간제 계약을 2년 넘게 이어 왔다면 기간 없는 계약으로 봐야 하는지 확인해요.',
    keywords: /2\s*년|기간제|계약\s*연장|계약직|무기\s*계약|재계약/,
  },
  written_terms: {
    id: 'written_terms',
    label: '근로계약서를 제대로 받았는지',
    description: '근로조건이 적힌 서면을 받았는지, 필수 항목이 다 있는지 확인해요.',
    keywords: /계약서|서면|안\s*써|못\s*받|작성|사인|서명/,
  },
  dismissal_notice: {
    id: 'dismissal_notice',
    label: '해고 예고(30일)를 지켰는지',
    description: '해고 30일 전 예고 또는 30일분 통상임금(해고예고수당)을 확인해요.',
    keywords: /해고|그만\s*나오|나오지\s*(마|말)|잘렸|잘림|내일부터\s*안|예고\s*수당|해고\s*예고/,
  },
  retirement_payment: {
    id: 'retirement_payment',
    label: '퇴사 후 임금 정산 기한(14일)을 지켰는지',
    description: '그만둔 뒤 14일 안에 남은 임금·수당을 받았는지 확인해요.',
    keywords: /퇴사|그만\s*뒀|그만둔|퇴직|마지막\s*월급|정산|14\s*일/,
  },
};

/** 상담 유형별로 점검할 수 있는 쟁점. '기타'는 전부 후보다. */
export const CATEGORY_ISSUES: Record<CategoryId, IssueId[]> = {
  wage: [
    'minimum_wage',
    'minimum_monthly',
    'weekly_holiday',
    'overtime_premium',
    'wage_statement',
    'retirement_payment',
  ],
  hours: ['break', 'overtime_premium', 'part_time_overtime', 'weekly_holiday'],
  contract: ['written_terms', 'fixed_term_duration'],
  dismissal: ['dismissal_notice', 'retirement_payment'],
  leave: ['weekly_holiday'],
  other: [
    'break',
    'minimum_wage',
    'minimum_monthly',
    'weekly_holiday',
    'overtime_premium',
    'part_time_overtime',
    'wage_statement',
    'written_terms',
    'fixed_term_duration',
    'dismissal_notice',
    'retirement_payment',
  ],
};

/**
 * 질문에서 쟁점을 추정한다.
 * 단서가 하나의 쟁점만 가리키면 그 쟁점, 여러 개면 그 후보들, 없으면 유형의 전체 후보를 돌려준다.
 */
export function routeIssues(category: CategoryId, question: string): IssueId[] {
  const candidates = CATEGORY_ISSUES[category];
  const matched = candidates.filter((id) => ISSUES[id].keywords.test(question));
  return matched.length > 0 ? matched : candidates;
}

/** 전제 항목: 모든 쟁점에서 먼저 확인하는 적용 범위 */
export const PREMISE_KEYS = ['as_of_date', 'korea', 'adult', 'retail', 'workers'] as const;

/** 백엔드 질문 문구에 덧붙이는 일상어 도움말 */
export const FIELD_HELP: Record<string, string> = {
  adult: '만 19세 이상이면 "예"를 선택해요.',
  retail:
    '편의점·카페·음식점·마트·학원 같은 곳이면 "예"예요. 버스·택시 등 운송업, 병원 등 보건업, 농림·축산·수산업, 경비 같은 감시·단속 업무는 근로시간 예외가 있어 "아니요"예요.',
  workers: '사장님과 사장님 가족을 뺀 직원 수예요. 아르바이트도 포함해요.',
  work_hours: '출퇴근 시간 사이에서 쉬는 시간을 뺀 실제 일한 시간이에요. 예: 6',
  rest_minutes: '하루에 받은 휴게시간을 분으로 적어요. 전혀 없었다면 0',
  free_rest: '손님 응대나 대기 지시 없이 마음대로 쉴 수 있었는지 물어요.',
  during_work: '쉬는 시간이 출근 뒤, 퇴근 전에 있었는지 물어요. 출근 전·퇴근 후는 휴게가 아니에요.',
  special_break_exception:
    '경비·감시처럼 고용노동부 승인을 받은 특수한 근무가 아니면 "아니요"예요.',
  hourly_wage: '세금을 떼기 전, 다른 수당을 뺀 기본 시급이에요.',
  other_pay: '기본 시급 말고 따로 받는 수당(식대·주휴수당 등)이 있는지 물어요.',
  probation: '지금 수습 기간이면 "예"예요.',
  continuous_months: '처음 출근한 날부터 지금(또는 그만둔 날)까지 몇 달인지 적어요.',
  average_weekly_scheduled_hours: '최근 4주 동안 일주일에 일하기로 정한 시간의 평균이에요.',
  statutory_overtime_hours: '하루 8시간 또는 주 40시간을 넘겨 일한 시간을 일주일 기준으로 적어요.',
  premium_percent: '연장근로 시간에 평소 시급보다 몇 % 더 받았는지 적어요. 못 받았다면 0',
};

export const BOOLEAN_LABELS = { true: '예', false: '아니요' } as const;

export const CHOICE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  employment_type: [
    { value: 'fixed', label: '기간제(계약 기간이 정해짐)' },
    { value: 'part_time', label: '단시간(다른 직원보다 짧게 일함)' },
    { value: 'both', label: '둘 다' },
  ],
};
