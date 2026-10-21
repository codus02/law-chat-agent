/**
 * 표준근로계약서(고용노동부 양식) 항목을 담는 초안과, 입력값에 따라 조건부로 뜨는 점검 결과.
 * 판단 기준은 근로기준법 제17·54·55조, 최저임금법 제5·6조, 기간제법 제4·17조의 조문 수준이며,
 * 사업장 규모·업종별 예외는 다루지 않는다. 결과는 참고용이며 전문가 검토를 대체하지 않는다.
 */
import { MINIMUM_WAGE_2026, WEEKDAYS } from './contract-check';
import { formatNumber } from './format';

export type PayUnit = '시급' | '일급' | '월급';
export type PayCycle = '매일' | '매주' | '매월';
export type PayMethod = '근로자 명의 계좌 입금' | '직접 지급';

export type Draft = {
  employerName: string;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  workerName: string;
  workerPhone: string;
  workerAddress: string;
  signedDate: string;
  startDate: string;
  endDate: string;
  indefinite: boolean;
  workplace: string;
  duties: string;
  workStart: string;
  workEnd: string;
  breakStart: string;
  breakEnd: string;
  workdays: string[];
  dailyHours: Record<string, string>;
  workScheduleNote: string;
  weeklyHoliday: string;
  payUnit: PayUnit;
  basePay: string;
  probation: boolean;
  wageCalculation: string;
  bonus: string;
  allowances: string;
  payCycle: PayCycle;
  payDay: string;
  payMethod: PayMethod;
  insurance: string[];
  copyProvided: boolean;
  /** 체결 전 직접 확인하는 항목 */
  confirmations: Record<ConfirmationKey, boolean>;
};

export const INSURANCE = ['고용보험', '산재보험', '국민연금', '건강보험'] as const;

export const CONFIRMATIONS = [
  {
    key: 'overtime',
    title: '연장·야간·휴일근로 합의',
    text: '추가 근로가 있다면 사전에 합의하고 가산수당(50% 이상) 기준을 확인했어요.',
  },
  {
    key: 'payslip',
    title: '임금명세서',
    text: '급여일마다 계산 내역이 적힌 임금명세서를 받기로 했어요(근로기준법 제48조).',
  },
  {
    key: 'termination',
    title: '퇴직·계약 해지',
    text: '퇴직 절차와 계약 갱신·해지 조건을 확인했어요.',
  },
] as const;
export type ConfirmationKey = (typeof CONFIRMATIONS)[number]['key'];

export const PROBATION_MINIMUM_WAGE = Math.floor(MINIMUM_WAGE_2026 * 0.9);

export function createDraft(partial: Partial<Draft> = {}): Draft {
  return {
    employerName: '',
    businessName: '',
    businessPhone: '',
    businessAddress: '',
    workerName: '',
    workerPhone: '',
    workerAddress: '',
    signedDate: '',
    startDate: '',
    endDate: '',
    indefinite: false,
    workplace: '',
    duties: '',
    workStart: '',
    workEnd: '',
    breakStart: '',
    breakEnd: '',
    workdays: [],
    dailyHours: {},
    workScheduleNote: '',
    weeklyHoliday: '',
    payUnit: '시급',
    basePay: '',
    probation: false,
    wageCalculation: '',
    bonus: '',
    allowances: '',
    payCycle: '매월',
    payDay: '',
    payMethod: '근로자 명의 계좌 입금',
    insurance: [],
    copyProvided: false,
    confirmations: { overtime: false, payslip: false, termination: false },
    ...partial,
  };
}

/* ───────── 계산 ───────── */

function minutesOf(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 시작·종료 시각으로 구한 분 단위 길이. 자정을 넘기면 다음 날로 본다. */
function spanMinutes(start: string, end: string): number | null {
  const a = minutesOf(start);
  const b = minutesOf(end);
  if (a === null || b === null) return null;
  const diff = b - a;
  return diff > 0 ? diff : diff + 24 * 60;
}

export type Derived = {
  /** 시업·종업으로 계산한 하루 체류시간(분) */
  presenceMinutes: number | null;
  breakMinutes: number | null;
  /** 휴게가 근로 시작·종료 사이에 있는지 */
  breakInsideWork: boolean | null;
  /** 체류시간에서 휴게를 뺀 하루 소정근로시간 */
  dailyWorkHours: number | null;
  /** 요일별 입력이 있으면 그 합, 없으면 근무일 수 × 하루 근로시간 */
  weeklyHours: number | null;
  workingDays: number;
  /** 주 소정근로시간 ÷ 40 × 8, 최대 8 */
  paidHolidayHours: number;
  /** 월 환산 시간 (주 근로 + 주휴) × 365/7/12 */
  monthlyHours: number | null;
  /** 입력한 임금을 시급으로 환산한 값 */
  hourlyEquivalent: number | null;
  contractMonths: number | null;
};

export function derive(draft: Draft): Derived {
  const presenceMinutes = spanMinutes(draft.workStart, draft.workEnd);
  const breakMinutes =
    draft.breakStart && draft.breakEnd
      ? spanMinutes(draft.breakStart, draft.breakEnd)
      : draft.breakStart || draft.breakEnd
        ? null
        : 0;
  let breakInsideWork: boolean | null = null;
  if (presenceMinutes !== null && breakMinutes !== null && breakMinutes > 0) {
    const start = minutesOf(draft.workStart)!;
    const breakAt = minutesOf(draft.breakStart)!;
    const offset = (breakAt - start + 24 * 60) % (24 * 60);
    breakInsideWork = offset > 0 && offset + breakMinutes < presenceMinutes;
  }
  const dailyWorkHours =
    presenceMinutes !== null && breakMinutes !== null
      ? Math.max(0, presenceMinutes - breakMinutes) / 60
      : null;
  const dayEntries = draft.workdays
    .map((day) => Number(draft.dailyHours[day]))
    .filter((value) => value > 0);
  const workingDays = draft.workdays.length;
  const weeklyHours =
    dayEntries.length === workingDays && workingDays > 0
      ? dayEntries.reduce((sum, value) => sum + value, 0)
      : workingDays > 0 && dailyWorkHours
        ? workingDays * dailyWorkHours
        : null;
  const paidHolidayHours =
    weeklyHours !== null && weeklyHours >= 15 ? Math.min(8, (weeklyHours / 40) * 8) : 0;
  const monthlyHours =
    weeklyHours !== null ? ((weeklyHours + paidHolidayHours) * 365) / 7 / 12 : null;
  const pay = Number(draft.basePay);
  let hourlyEquivalent: number | null = null;
  if (pay > 0) {
    if (draft.payUnit === '시급') hourlyEquivalent = pay;
    else if (draft.payUnit === '일급' && dailyWorkHours) hourlyEquivalent = pay / dailyWorkHours;
    else if (draft.payUnit === '월급' && monthlyHours) hourlyEquivalent = pay / monthlyHours;
  }
  let contractMonths: number | null = null;
  if (draft.startDate && draft.endDate && !draft.indefinite) {
    const start = new Date(draft.startDate);
    const end = new Date(draft.endDate);
    contractMonths = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
  }
  return {
    presenceMinutes,
    breakMinutes,
    breakInsideWork,
    dailyWorkHours,
    weeklyHours,
    workingDays,
    paidHolidayHours,
    monthlyHours,
    hourlyEquivalent,
    contractMonths,
  };
}

/* ───────── 조건부 점검 ───────── */

export type Tone = 'danger' | 'warning' | 'info' | 'ok';
export type Section =
  'period' | 'place' | 'hours' | 'days' | 'wage' | 'leave' | 'insurance' | 'copy' | 'confirm';

/** 점검 결과가 가리키는 입력칸. 요일별 근로시간은 `daily:월요일`처럼 쓴다. */
export type FieldKey = keyof Draft | `daily:${string}`;

export type Finding = {
  section: Section;
  tone: Tone;
  title: string;
  text: string;
  /** 짧은 법령명·조문 */
  basis?: string;
  /** 이 결과 때문에 고쳐야 할 입력칸. 화면에서 해당 칸 테두리를 강조한다. */
  fields?: FieldKey[];
  /** 이 결과를 일으킨 입력칸(고칠 칸은 아님). 여기에 값이 있으면 고칠 칸이 비어 있어도 바로 강조한다. */
  causes?: FieldKey[];
};

export function requiredBreakMinutes(hours: number): number {
  if (hours >= 8) return 60;
  if (hours >= 4) return 30;
  return 0;
}

export function checkDraft(draft: Draft): { findings: Finding[]; derived: Derived } {
  const d = derive(draft);
  const findings: Finding[] = [];
  const push = (finding: Finding) => findings.push(finding);

  // 02 계약기간
  if (!draft.startDate) {
    push({
      section: 'period',
      tone: 'warning',
      title: '근로개시일이 비어 있어요',
      fields: ['startDate'],
      text: '언제부터 일하는지 날짜를 적으세요.',
      basis: '근로기준법 제17조',
    });
  } else if (!draft.indefinite && !draft.endDate) {
    push({
      section: 'period',
      tone: 'warning',
      title: '계약 종료일 또는 기간의 정함 없음을 표시하세요',
      fields: ['endDate'],
      text: '기간을 정하지 않는 계약이면 체크하고, 정한다면 종료일을 적으세요.',
    });
  } else if (draft.endDate && !draft.indefinite && draft.endDate < draft.startDate) {
    push({
      section: 'period',
      tone: 'danger',
      title: '계약 종료일이 시작일보다 빨라요',
      fields: ['startDate', 'endDate'],
      text: '날짜를 다시 확인하세요.',
    });
  } else if (d.contractMonths !== null && d.contractMonths > 24) {
    push({
      section: 'period',
      tone: 'info',
      title: '기간제 계약이 2년을 넘어요',
      fields: ['endDate'],
      text: '같은 사용자와 2년을 넘겨 기간제로 일하면 원칙적으로 기간을 정하지 않은 계약으로 봅니다.',
      basis: '기간제법 제4조',
    });
  }

  // 03 장소·업무
  if (!draft.workplace.trim() || !draft.duties.trim()) {
    push({
      section: 'place',
      tone: 'warning',
      title: '근무 장소와 업무 내용은 필수 기재사항이에요',
      fields: [
        ...(!draft.workplace.trim() ? (['workplace'] as const) : []),
        ...(!draft.duties.trim() ? (['duties'] as const) : []),
      ],
      text: '지점명·주소와 실제 맡을 일을 구체적으로 적으세요.',
      basis: '근로기준법 제17조',
    });
  }

  // 04 근로시간·휴게
  if (!draft.workStart || !draft.workEnd) {
    push({
      section: 'hours',
      tone: 'warning',
      title: '근로 시작·종료 시각을 적으세요',
      fields: [
        ...(!draft.workStart ? (['workStart'] as const) : []),
        ...(!draft.workEnd ? (['workEnd'] as const) : []),
      ],
      text: '소정근로시간은 서면 명시 항목이에요.',
      basis: '근로기준법 제17조',
    });
  } else if (d.dailyWorkHours !== null) {
    const required = requiredBreakMinutes(d.dailyWorkHours);
    const breakMinutes = d.breakMinutes ?? 0;
    if (d.breakMinutes === null) {
      push({
        section: 'hours',
        tone: 'warning',
        title: '휴게 시작·종료 시각을 둘 다 적으세요',
        fields: [draft.breakStart ? 'breakEnd' : 'breakStart'],
        text: '한쪽만 적혀 있어 휴게 길이를 계산할 수 없어요.',
      });
    } else if (required > 0 && breakMinutes < required) {
      push({
        section: 'hours',
        tone: 'danger',
        title: `휴게시간이 ${required - breakMinutes}분 부족해요`,
        fields: ['breakStart', 'breakEnd'],
        causes: ['workStart', 'workEnd'],
        text: `하루 ${formatHours(d.dailyWorkHours)}시간 근로에는 근로 도중 ${required}분 이상의 휴게가 필요해요. 지금은 ${breakMinutes}분이에요.`,
        basis: '근로기준법 제54조',
      });
    } else if (breakMinutes > 0 && d.breakInsideWork === false) {
      push({
        section: 'hours',
        tone: 'danger',
        title: '휴게가 근로시간 밖에 있어요',
        fields: ['breakStart', 'breakEnd'],
        causes: ['workStart', 'workEnd'],
        text: '휴게는 근로시간 도중에 주어야 해요. 출근 전·퇴근 후 시간은 휴게로 보지 않아요.',
        basis: '근로기준법 제54조',
      });
    } else if (required > 0) {
      push({
        section: 'hours',
        tone: 'ok',
        title: '휴게시간 기준을 충족해요',
        text: `하루 ${formatHours(d.dailyWorkHours)}시간 근로, 휴게 ${breakMinutes}분. 실제로 자유롭게 쉴 수 있어야 해요.`,
        basis: '근로기준법 제54조',
      });
    }
    if (d.dailyWorkHours > 8) {
      push({
        section: 'hours',
        tone: 'info',
        title: '하루 8시간을 넘는 소정근로시간이에요',
        text: '8시간을 넘는 부분은 연장근로라 당사자 합의가 필요하고, 5인 이상 사업장은 50% 이상 가산해요.',
        basis: '근로기준법 제50·53·56조',
      });
    }
  }

  // 05 근무일·주휴일
  if (draft.workdays.length === 0 && !draft.workScheduleNote.trim()) {
    push({
      section: 'days',
      tone: 'warning',
      title: '근무 요일을 정하세요',
      fields: ['workdays'],
      text: '단시간 근로자는 근로일과 근로일별 근로시간을 서면에 적어야 해요.',
      basis: '기간제법 제17조',
    });
  }
  if (draft.workdays.length === 7) {
    push({
      section: 'days',
      tone: 'danger',
      title: '매일 근무로 되어 있어 주휴일을 둘 수 없어요',
      fields: ['workdays'],
      text: '1주에 평균 1회 이상의 유급휴일이 있어야 해요.',
      basis: '근로기준법 제55조',
    });
  }
  if (draft.weeklyHoliday && draft.workdays.includes(draft.weeklyHoliday)) {
    push({
      section: 'days',
      tone: 'danger',
      title: '주휴일이 근무 요일과 겹쳐요',
      fields: ['weeklyHoliday'],
      text: '주휴일은 근무하지 않는 요일로 정하세요.',
      basis: '근로기준법 제55조',
    });
  }
  const missingDaily = draft.workdays.filter((day) => !(Number(draft.dailyHours[day]) > 0));
  if (draft.workdays.length > 0 && missingDaily.length > 0 && d.dailyWorkHours === null) {
    push({
      section: 'days',
      tone: 'warning',
      title: `${missingDaily.join('·')} 근로시간이 비어 있어요`,
      fields: missingDaily.map((day): FieldKey => `daily:${day}`),
      text: '요일별 근로시간은 단시간 근로계약의 필수 기재사항이에요.',
      basis: '기간제법 제17조',
    });
  }
  // 요일마다 근로시간이 다를 수 있어, 각 요일 시간에 필요한 휴게를 3번 휴게와 비교한다.
  if (d.breakMinutes !== null) {
    const givenBreak = d.breakMinutes;
    const shortDays = draft.workdays.filter((day) => {
      const hours = Number(draft.dailyHours[day]);
      return hours > 0 && requiredBreakMinutes(hours) > givenBreak;
    });
    if (shortDays.length > 0) {
      const dayFields = shortDays.map((day): FieldKey => `daily:${day}`);
      const breakShort = findings.find((f) => f.title.startsWith('휴게시간이 '));
      if (breakShort) {
        breakShort.fields = [...(breakShort.fields ?? []), ...dayFields];
      } else {
        push({
          section: 'days',
          tone: 'danger',
          title: `${shortDays.map((day) => day.slice(0, 1)).join('·')}요일 근로시간에 맞는 휴게가 부족해요`,
          fields: [...dayFields, 'breakStart', 'breakEnd'],
          text: `하루 4시간 이상 일하면 근로 도중 30분, 8시간 이상이면 1시간 이상 쉬어야 해요. 지금 휴게는 ${givenBreak}분이에요. 3번 휴게 시각을 확인하세요.`,
          basis: '근로기준법 제54조',
        });
      }
    }
  }
  if (d.weeklyHours !== null) {
    if (d.weeklyHours >= 15 && !draft.weeklyHoliday) {
      push({
        section: 'days',
        tone: 'warning',
        title: '주휴일 요일을 정하세요',
        fields: ['weeklyHoliday'],
        text: `주 ${formatHours(d.weeklyHours)}시간 근로는 유급 주휴일 대상이에요. 요일을 계약서에 적으세요.`,
        basis: '근로기준법 제55조·제18조',
      });
    } else if (d.weeklyHours < 15) {
      push({
        section: 'days',
        tone: 'info',
        title: '주 15시간 미만이라 주휴일·연차가 적용되지 않을 수 있어요',
        text: `4주 평균 주 ${formatHours(d.weeklyHours)}시간이면 주휴일과 연차유급휴가 규정이 적용되지 않아요.`,
        basis: '근로기준법 제18조 제3항',
      });
    } else if (draft.weeklyHoliday) {
      push({
        section: 'days',
        tone: 'ok',
        title: '주휴일이 정해져 있어요',
        text: `주 ${formatHours(d.weeklyHours)}시간 근로, 주휴일 ${draft.weeklyHoliday}.`,
        basis: '근로기준법 제55조',
      });
    }
  }

  // 06 임금
  const pay = Number(draft.basePay);
  if (!(pay > 0)) {
    push({
      section: 'wage',
      tone: 'warning',
      title: '기본 임금을 적으세요',
      fields: ['basePay'],
      text: '임금의 구성항목·계산방법·지급방법은 서면 명시 항목이에요.',
      basis: '근로기준법 제17조',
    });
  } else if (d.hourlyEquivalent !== null) {
    const hourly = d.hourlyEquivalent;
    const label = draft.payUnit === '시급' ? '시급' : `${draft.payUnit}을 시급으로 환산한 금액`;
    if (hourly < MINIMUM_WAGE_2026) {
      if (
        draft.probation &&
        hourly >= PROBATION_MINIMUM_WAGE &&
        (draft.indefinite || (d.contractMonths !== null && d.contractMonths >= 12))
      ) {
        push({
          section: 'wage',
          tone: 'warning',
          title: '수습 감액 범위 안이지만 조건을 확인하세요',
          fields: ['basePay'],
          text: `${label} ${formatNumber(Math.round(hourly))}원은 최저임금의 90%(${formatNumber(PROBATION_MINIMUM_WAGE)}원) 이상이에요. 감액은 1년 이상 계약의 수습 시작 3개월까지만, 단순노무 업무는 불가예요.`,
          basis: '최저임금법 제5조 제2항',
        });
      } else {
        push({
          section: 'wage',
          tone: 'danger',
          title: '최저임금보다 낮아요',
          fields: ['basePay'],
          text: `${label} ${formatNumber(Math.round(hourly))}원은 2026년 최저임금 ${formatNumber(MINIMUM_WAGE_2026)}원보다 ${formatNumber(Math.round(MINIMUM_WAGE_2026 - hourly))}원 적어요.${draft.probation ? ' 수습 감액은 1년 이상 계약에서 최저임금의 90%까지만 가능해요.' : ''} 최저임금에 못 미치는 부분은 무효이고 최저임금액을 지급해야 해요.`,
          basis: '최저임금법 제6조',
        });
      }
    } else {
      push({
        section: 'wage',
        tone: 'ok',
        title: '최저임금 이상이에요',
        text:
          draft.payUnit === '시급'
            ? `시급 ${formatNumber(pay)}원 (2026년 최저임금 ${formatNumber(MINIMUM_WAGE_2026)}원).`
            : `${draft.payUnit} ${formatNumber(pay)}원은 시급 약 ${formatNumber(Math.round(hourly))}원으로 환산돼요${draft.payUnit === '월급' && d.monthlyHours ? ` (월 ${Math.round(d.monthlyHours)}시간 기준)` : ''}.`,
        basis: '최저임금법 제6조',
      });
    }
  } else if (draft.payUnit !== '시급') {
    push({
      section: 'wage',
      tone: 'info',
      title: `${draft.payUnit}을 시급으로 환산하려면 근로시간이 필요해요`,
      text: '근로 시작·종료 시각과 근무 요일을 적으면 최저임금과 비교해 드려요.',
    });
  }
  if (!draft.payDay.trim()) {
    push({
      section: 'wage',
      tone: 'warning',
      title: '임금 지급일을 적으세요',
      fields: ['payDay'],
      text: '지급일과 지급방법은 서면 명시 항목이에요. 지급일이 휴일이면 그 전날 지급해요.',
      basis: '근로기준법 제17조·제43조',
    });
  }
  if (draft.payMethod === '직접 지급') {
    push({
      section: 'wage',
      tone: 'info',
      title: '현금 직접 지급이면 지급 기록을 남기세요',
      text: '임금명세서와 수령 확인을 함께 보관하면 다툼을 줄일 수 있어요.',
      basis: '근로기준법 제48조',
    });
  }

  // 08 사회보험
  if (draft.insurance.length === 0) {
    push({
      section: 'insurance',
      tone: 'info',
      title: '사회보험 적용 여부를 표시하세요',
      text: '산재보험은 근로시간과 관계없이 적용돼요. 주 15시간 이상이면 고용·건강·국민연금 가입 대상인지 확인하세요.',
    });
  } else if (!draft.insurance.includes('산재보험')) {
    push({
      section: 'insurance',
      tone: 'warning',
      title: '산재보험이 빠져 있어요',
      fields: ['insurance'],
      text: '산재보험은 단시간 근로자에게도 적용돼요.',
    });
  }

  // 09 교부
  if (!draft.copyProvided) {
    push({
      section: 'copy',
      tone: 'danger',
      title: '계약서 사본을 받기로 표시하세요',
      fields: ['copyProvided'],
      text: '사용자는 서면 명시 사항이 적힌 계약서를 근로자에게 교부해야 해요. 종이나 전자문서 모두 가능해요.',
      basis: '근로기준법 제17조 제2항',
    });
  }

  // 체결 전 확인
  const unconfirmed = CONFIRMATIONS.filter((item) => !draft.confirmations[item.key]);
  if (unconfirmed.length > 0) {
    push({
      section: 'confirm',
      tone: 'info',
      title: `체결 전 확인 ${unconfirmed.length}개가 남았어요`,
      text: unconfirmed.map((item) => item.title).join(', '),
    });
  }

  return { findings, derived: d };
}

export function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function summarize(findings: Finding[]) {
  return {
    danger: findings.filter((f) => f.tone === 'danger').length,
    warning: findings.filter((f) => f.tone === 'warning').length,
    info: findings.filter((f) => f.tone === 'info').length,
    ok: findings.filter((f) => f.tone === 'ok').length,
  };
}

export const SECTION_TITLES: Record<Section, string> = {
  period: '근로계약기간',
  place: '근무 장소와 업무',
  hours: '소정근로시간과 휴게',
  days: '근무일과 주휴일',
  wage: '임금',
  leave: '연차유급휴가',
  insurance: '사회보험',
  copy: '계약서 교부',
  confirm: '체결 전 확인',
};

export { WEEKDAYS, MINIMUM_WAGE_2026 };
