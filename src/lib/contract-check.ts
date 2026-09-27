import { formatNumber } from './format';

export const MINIMUM_WAGE_2026 = 10_320;
export const MAX_WORKDAYS = 7;

export const WEEKDAYS = [
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
  '일요일',
] as const;

export const PAY_METHODS = ['본인 명의 계좌이체', '현금 직접 지급', '기타'] as const;

export const EXTRA_CHECKS = [
  {
    key: 'overtime',
    title: '추가근로 사전합의',
    description: '연장·야간·휴일근로 여부와 수당 계산 기준을 확인했습니다.',
  },
  {
    key: 'payslip',
    title: '임금명세서',
    description: '매 급여일에 계산 내역이 적힌 임금명세서를 받기로 했습니다.',
  },
  {
    key: 'insurance',
    title: '보험과 공제',
    description: '4대 보험 가입 여부와 급여에서 공제될 항목을 확인했습니다.',
  },
  {
    key: 'termination',
    title: '퇴직과 계약 해지',
    description: '퇴직 절차, 계약 갱신 및 해지 조건을 확인했습니다.',
  },
] as const;

export type ExtraKey = (typeof EXTRA_CHECKS)[number]['key'];

export const CHECK_BASIS = '근로기준법 제17조, 제18조, 제43조, 제54조, 제55조, 제60조';

/** 입력값은 폼에 보이는 그대로(문자열) 보관하고, 판단할 때만 숫자로 바꾼다. */
export type Workday = {
  id: number;
  day: string;
  hours: string;
  breakMinutes: string;
  freeBreak: boolean;
};

export type ConditionForm = {
  hourlyWage: string;
  payDay: string;
  payMethod: string;
  allowances: string;
  wageWritten: boolean;
  workdays: Workday[];
  workplace: string;
  jobDuties: string;
  startDate: string;
  endDate: string;
  indefinite: boolean;
  extras: Record<ExtraKey, boolean>;
  contractCopy: boolean;
};

export function createWorkday(id: number): Workday {
  return { id, day: '', hours: '', breakMinutes: '', freeBreak: false };
}

export function createInitialForm(): ConditionForm {
  return {
    hourlyWage: '',
    payDay: '',
    payMethod: '',
    allowances: '',
    wageWritten: false,
    workdays: [createWorkday(1)],
    workplace: '',
    jobDuties: '',
    startDate: '',
    endDate: '',
    indefinite: false,
    extras: { overtime: false, payslip: false, insurance: false, termination: false },
    contractCopy: false,
  };
}

function toNumber(value: string): number {
  return Number(value) || 0;
}

export function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** 근로기준법 제54조: 4시간 이상 30분, 8시간 이상 1시간 이상의 휴게. */
export function requiredBreakMinutes(hours: number): number {
  if (hours >= 8) return 60;
  if (hours >= 4) return 30;
  return 0;
}

export type BreakCheck = {
  tone: 'neutral' | 'ok' | 'warning' | 'danger';
  title: string;
  detail: string;
};

export function checkBreak(workday: Workday): BreakCheck {
  const hours = toNumber(workday.hours);
  const breakMinutes = toNumber(workday.breakMinutes);
  const required = requiredBreakMinutes(hours);

  if (!hours) {
    return {
      tone: 'neutral',
      title: '시간을 입력하세요',
      detail: '필요한 휴게시간을 계산해 드려요.',
    };
  }
  if (!required) {
    return { tone: 'ok', title: '법정 최소 휴게 없음', detail: '4시간 미만 근무입니다.' };
  }
  if (breakMinutes < required) {
    return {
      tone: 'danger',
      title: `${required - breakMinutes}분 부족해요`,
      detail: `${hours}시간 근무는 최소 ${required}분이 필요해요.`,
    };
  }
  if (!workday.freeBreak) {
    return {
      tone: 'warning',
      title: '이용 조건을 확인하세요',
      detail: '근로 도중 자유롭게 쓸 수 있어야 해요.',
    };
  }
  return { tone: 'ok', title: '휴게시간 충족', detail: `최소 ${required}분 기준을 확인했어요.` };
}

export type ConditionStatus = {
  hourlyWage: number;
  belowMinimumWage: boolean;
  wageDetailsComplete: boolean;
  wageComplete: boolean;
  scheduleComplete: boolean;
  breakComplete: boolean;
  duplicateDays: boolean;
  workingDays: number;
  weeklyHours: number;
  placeComplete: boolean;
  periodComplete: boolean;
  extraComplete: boolean;
  copyComplete: boolean;
  completed: number;
  total: number;
};

export function evaluateConditions(form: ConditionForm): ConditionStatus {
  const workdays = form.workdays.map((workday) => ({
    day: workday.day,
    hours: toNumber(workday.hours),
    breakMinutes: toNumber(workday.breakMinutes),
    freeBreak: workday.freeBreak,
  }));
  const selectedDays = workdays.map((workday) => workday.day).filter(Boolean);
  const duplicateDays = new Set(selectedDays).size !== selectedDays.length;
  const scheduleComplete =
    workdays.length > 0 &&
    workdays.every((workday) => workday.day && workday.hours > 0) &&
    !duplicateDays;
  const breakComplete =
    scheduleComplete &&
    workdays.every((workday) => {
      const required = requiredBreakMinutes(workday.hours);
      return required === 0 || (workday.breakMinutes >= required && workday.freeBreak);
    });

  const hourlyWage = toNumber(form.hourlyWage);
  const payDay = toNumber(form.payDay);
  const wageDetailsComplete =
    hourlyWage > 0 && payDay >= 1 && payDay <= 31 && form.payMethod !== '' && form.wageWritten;
  const minimumWageMet = hourlyWage >= MINIMUM_WAGE_2026;

  const placeComplete = form.workplace.trim() !== '' && form.jobDuties.trim() !== '';
  const periodComplete =
    form.startDate !== '' &&
    (form.indefinite || (form.endDate !== '' && form.endDate >= form.startDate));
  const extraComplete = EXTRA_CHECKS.every((check) => form.extras[check.key]);

  const status = {
    hourlyWage,
    belowMinimumWage: hourlyWage > 0 && !minimumWageMet,
    wageDetailsComplete,
    wageComplete: wageDetailsComplete && minimumWageMet,
    scheduleComplete,
    breakComplete,
    duplicateDays,
    workingDays: workdays.filter((workday) => workday.day && workday.hours).length,
    weeklyHours: workdays.reduce((sum, workday) => sum + workday.hours, 0),
    placeComplete,
    periodComplete,
    extraComplete,
    copyComplete: form.contractCopy,
  };
  const checkpoints = [
    status.wageComplete,
    status.scheduleComplete,
    status.breakComplete,
    status.placeComplete,
    status.periodComplete,
    status.extraComplete,
    status.copyComplete,
  ];

  return {
    ...status,
    completed: checkpoints.filter(Boolean).length,
    total: checkpoints.length,
  };
}

export type Finding = {
  tone: 'danger' | 'warning' | 'info';
  title: string;
  text: string;
};

/** 점검 결과 목록. issues는 조치가 필요한 항목, notices는 참고 안내다. */
export function collectFindings(
  form: ConditionForm,
  status: ConditionStatus,
): { issues: Finding[]; notices: Finding[] } {
  const issues: Finding[] = [];
  const notices: Finding[] = [];

  if (!status.wageDetailsComplete) {
    issues.push({
      tone: 'danger',
      title: '임금 조건을 끝까지 확인해 주세요',
      text: '시급, 매월 지급일, 지급 방법을 입력하고 계약서에 계산 방법까지 적혔는지 확인하세요.',
    });
  }
  if (status.belowMinimumWage) {
    issues.push({
      tone: 'danger',
      title: '입력한 시급이 2026년 최저임금보다 낮아요',
      text: `입력 시급은 ${formatNumber(status.hourlyWage)}원으로, 2026년 최저임금 ${formatNumber(MINIMUM_WAGE_2026)}원보다 ${formatNumber(MINIMUM_WAGE_2026 - status.hourlyWage)}원 적습니다. 수습 감액 등 법정 예외에 해당하는지는 별도로 확인하세요.`,
    });
  }
  if (!status.scheduleComplete) {
    issues.push({
      tone: 'danger',
      title: '근무일과 근로시간이 불완전해요',
      text: status.duplicateDays
        ? '같은 요일이 두 번 선택되어 있습니다. 요일별 근무시간을 한 줄로 정리하세요.'
        : '모든 근무일의 요일과 하루 근로시간을 입력하세요.',
    });
  }
  for (const workday of form.workdays) {
    const hours = toNumber(workday.hours);
    const breakMinutes = toNumber(workday.breakMinutes);
    const required = requiredBreakMinutes(hours);
    const dayLabel = workday.day || '요일 미선택';
    if (required && breakMinutes < required) {
      issues.push({
        tone: 'danger',
        title: `${dayLabel} 휴게시간이 부족해요`,
        text: `${hours}시간 근무에는 최소 ${required}분이 필요합니다. 현재 입력은 ${breakMinutes}분입니다.`,
      });
    } else if (required && !workday.freeBreak) {
      issues.push({
        tone: 'warning',
        title: `${dayLabel} 휴게 이용 조건을 확인하세요`,
        text: '휴게시간은 근로시간 도중에 주어지고 자유롭게 이용할 수 있어야 합니다.',
      });
    }
  }
  if (!status.placeComplete) {
    issues.push({
      tone: 'warning',
      title: '근무 장소와 담당 업무가 빠졌어요',
      text: '지점명·주소와 실제 담당할 업무를 계약서 문구로 구체화하세요.',
    });
  }
  if (!status.periodComplete) {
    issues.push({
      tone: 'warning',
      title: '계약 기간을 확인해 주세요',
      text: '근무 시작일과 종료일을 적거나 기간의 정함이 없는 계약인지 표시하세요.',
    });
  }
  if (status.weeklyHours >= 15) {
    notices.push({
      tone: 'info',
      title: '주휴일·연차 적용 여부도 계약서에서 확인하세요',
      text: `입력한 근로시간은 주 ${formatHours(status.weeklyHours)}시간입니다. 별도 입력은 받지 않지만, 주휴일과 연차는 사업장 규모·근속기간 등 적용 조건을 확인할 필요가 있습니다.`,
    });
  }
  if (!status.extraComplete) {
    issues.push({
      tone: 'warning',
      title: '추가 조건에 확인하지 않은 항목이 있어요',
      text: '추가근로 수당, 임금명세서, 보험·공제, 퇴직·해지 조건을 각각 직접 확인하세요.',
    });
  }
  if (!status.copyComplete) {
    issues.push({
      tone: 'danger',
      title: '근로계약서 한 부를 받아야 해요',
      text: '서명한 뒤 종이 또는 전자문서로 교부받아 보관하세요.',
    });
  }

  return { issues, notices };
}
