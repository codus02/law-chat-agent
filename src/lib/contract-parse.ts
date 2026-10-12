/**
 * 근로계약서 본문(텍스트)에서 표준근로계약서 항목을 읽어 초안을 채운다.
 * 고용노동부 표준 양식의 항목명("근로계약기간", "소정근로시간", "임금", "지급일" 등)을 기준으로 찾고,
 * 못 찾은 항목은 비워 둔다. 읽은 항목은 `found`에 기록해 사용자가 확인하도록 보여 준다.
 */
import { createDraft, type Draft, type PayUnit } from './contract-draft';

export type ParsedContract = {
  draft: Draft;
  found: { field: string; value: string }[];
  text: string;
};

const DAY_CHAR_TO_NAME: Record<string, string> = {
  월: '월요일',
  화: '화요일',
  수: '수요일',
  목: '목요일',
  금: '금요일',
  토: '토요일',
  일: '일요일',
};

function clean(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function toIsoDate(y: string, m: string, d: string) {
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const DATE = String.raw`(\d{2,4})\s*[.년\-/]\s*(\d{1,2})\s*[.월\-/]\s*(\d{1,2})\s*일?`;

function toTime(h: string, m?: string) {
  return `${h.padStart(2, '0')}:${(m ?? '0').padStart(2, '0')}`;
}

const TIME = String.raw`(\d{1,2})\s*[:시]\s*(\d{0,2})\s*분?`;
const RANGE = String.raw`${TIME}\s*(?:부터|~|∼|-|–|—|에서)\s*${TIME}`;

function parseAmount(raw: string): number | null {
  const s = raw.replace(/[\s,]/g, '');
  const m = /^(\d+(?:\.\d+)?)(만)?(?:(\d+)천)?$/.exec(s);
  if (!m) return null;
  let value = Number(m[1]) * (m[2] ? 10000 : 1);
  if (m[3]) value += Number(m[3]) * 1000;
  return Math.round(value);
}

/** 라벨 뒤의 값을 같은 줄에서 읽는다. 이름 항목은 콜론이 있을 때만 값으로 본다. */
function after(text: string, label: RegExp, requireColon = false): string | null {
  const colon = requireColon ? String.raw`\s*[:：]\s*` : String.raw`\s*[:：]?\s*`;
  const m = new RegExp(`(?:${label.source})` + colon + String.raw`([^\n]+)`).exec(text);
  if (!m) return null;
  const value = m[1].trim().replace(/^[:：]\s*/, '');
  // 라벨만 있고 값이 없거나, 계약 문장("…라 함)과")이 이어지면 값으로 보지 않는다.
  if (!value || /라\s*함|체결한다/.test(value)) return null;
  return value;
}

export function parseContractText(raw: string): ParsedContract {
  const text = clean(raw);
  const draft = createDraft();
  const found: { field: string; value: string }[] = [];
  const note = (field: string, value: string) => found.push({ field, value });

  // 계약기간
  const period = new RegExp(
    String.raw`근로\s*계약\s*기간[^\n]*?${DATE}\s*(?:부터|~|∼|-|–|—)\s*(?:${DATE})?`,
  ).exec(text);
  if (period) {
    draft.startDate = toIsoDate(period[1], period[2], period[3]);
    if (period[4]) draft.endDate = toIsoDate(period[4], period[5], period[6]);
    note(
      '근로계약기간',
      draft.endDate ? `${draft.startDate} ~ ${draft.endDate}` : `${draft.startDate}부터`,
    );
  } else {
    const start = new RegExp(String.raw`근로\s*개시일[^\n]*?${DATE}`).exec(text);
    if (start) {
      draft.startDate = toIsoDate(start[1], start[2], start[3]);
      note('근로개시일', draft.startDate);
    }
  }
  if (/기간의\s*정함이?\s*없/.test(text) && !draft.endDate) {
    draft.indefinite = true;
    note('계약 형태', '기간의 정함이 없음');
  }

  // 장소·업무
  const workplace = after(text, /근무\s*장소/);
  if (workplace) {
    draft.workplace = workplace;
    note('근무 장소', workplace);
  }
  const duties = after(text, /업무\s*(?:의\s*)?내용/);
  if (duties) {
    draft.duties = duties;
    note('업무 내용', duties);
  }

  // 근로시간·휴게
  const hoursLine = /(?:소정\s*)?근로\s*시간[^\n]*/.exec(text);
  if (hoursLine) {
    const range = new RegExp(RANGE).exec(hoursLine[0]);
    if (range) {
      draft.workStart = toTime(range[1], range[2]);
      draft.workEnd = toTime(range[3], range[4]);
      note('소정근로시간', `${draft.workStart} ~ ${draft.workEnd}`);
    }
  }
  const breakLine = /휴게\s*시간[^\n]*/.exec(text);
  if (breakLine) {
    const range = new RegExp(RANGE).exec(breakLine[0]);
    if (range) {
      draft.breakStart = toTime(range[1], range[2]);
      draft.breakEnd = toTime(range[3], range[4]);
      note('휴게시간', `${draft.breakStart} ~ ${draft.breakEnd}`);
    } else {
      const minutes = /(\d{1,3})\s*분/.exec(breakLine[0]);
      if (minutes) note('휴게시간', `${minutes[1]}분 (시각 미기재, 직접 입력 필요)`);
    }
  }

  // 근무일·주휴일 (근로일별 근로시간 표 포함)
  const dayLine = /근무일[^\n]*/.exec(text);
  const dayTable = [
    ...text.matchAll(/(월|화|수|목|금|토|일)\s*요일?\s*[:：]?\s*(\d{1,2}(?:\.\d)?)\s*시간/g),
  ];
  if (dayTable.length > 0) {
    for (const [, day, hours] of dayTable) {
      const name = DAY_CHAR_TO_NAME[day];
      if (!draft.workdays.includes(name)) draft.workdays.push(name);
      draft.dailyHours[name] = hours;
    }
    note('근로일별 근로시간', dayTable.map(([, day, hours]) => `${day} ${hours}시간`).join(', '));
  } else if (dayLine) {
    // "매주 월, 수, 금 근무, 주휴일 매주 일요일"처럼 주휴일이 같은 줄에 있으면 앞부분만 본다.
    const dayPart = dayLine[0].replace(/근무일\s*(?:\/\s*휴일)?\s*[:：]?/, '').split(/주휴일/)[0];
    const span = /(월|화|수|목|금|토|일)\s*요일?\s*(?:~|∼|-|부터)\s*(월|화|수|목|금|토|일)/.exec(
      dayPart,
    );
    if (span) {
      const chars = '월화수목금토일';
      const a = chars.indexOf(span[1]);
      const b = chars.indexOf(span[2]);
      for (let i = a; i <= b; i += 1) draft.workdays.push(DAY_CHAR_TO_NAME[chars[i]]);
    } else {
      const listed = dayPart.match(/(월|화|수|목|금|토|일)(?=요일|\s*[,·/]|\s*근무|\s*$)/g);
      if (listed) draft.workdays = [...new Set(listed.map((c) => DAY_CHAR_TO_NAME[c]))];
    }
    const count = /매주\s*(\d)\s*일/.exec(dayPart);
    if (draft.workdays.length === 0 && count) draft.workScheduleNote = `매주 ${count[1]}일 근무`;
    if (draft.workdays.length || draft.workScheduleNote) {
      note('근무일', draft.workdays.join(', ') || draft.workScheduleNote);
    }
  }
  const holiday = /주휴일[^\n]*?(월|화|수|목|금|토|일)\s*요일/.exec(text);
  if (holiday) {
    draft.weeklyHoliday = DAY_CHAR_TO_NAME[holiday[1]];
    note('주휴일', draft.weeklyHoliday);
  }

  // 임금
  const wageUnits: { pattern: RegExp; unit: PayUnit }[] = [
    {
      pattern: /(?:시간급|시급|시간당)\s*[:：]?\s*([\d,.\s]+(?:만)?(?:\s*\d+천)?)\s*원/,
      unit: '시급',
    },
    { pattern: /일급\s*[:：]?\s*([\d,.\s]+(?:만)?(?:\s*\d+천)?)\s*원/, unit: '일급' },
    { pattern: /월급\s*[:：]?\s*([\d,.\s]+(?:만)?(?:\s*\d+천)?)\s*원/, unit: '월급' },
  ];
  for (const { pattern, unit } of wageUnits) {
    const m = pattern.exec(text);
    const amount = m ? parseAmount(m[1]) : null;
    if (amount) {
      draft.payUnit = unit;
      draft.basePay = String(amount);
      note(unit, `${amount.toLocaleString('ko-KR')}원`);
      break;
    }
  }
  if (/수습/.test(text)) {
    draft.probation = true;
    note('수습', '수습 관련 문구 있음');
  }
  const bonus = after(text, /상여금/);
  if (bonus && !/없음|없다|무/.test(bonus)) {
    draft.bonus = bonus;
    note('상여금', bonus);
  }
  const allowances = after(text, /기타\s*급여|기타\s*수당|제수당/);
  if (allowances && !/없음|없다|무/.test(allowances)) {
    draft.allowances = allowances;
    note('기타 급여', allowances);
  }
  const payDay =
    /(?:임금\s*)?지급일\s*[:：]?\s*(매월|매주|매일)?\s*(말일|\d{1,2}\s*일|[월화수목금토일]요일)/.exec(
      text,
    );
  if (payDay) {
    draft.payDay = payDay[2].replace(/\s/g, '');
    draft.payCycle = payDay[1] === '매주' ? '매주' : payDay[1] === '매일' ? '매일' : '매월';
    note('임금 지급일', `${draft.payCycle} ${draft.payDay}`);
  }
  // 지급방법: 체크 표시된 선택지를 우선 본다.
  const accountChecked = /(?:입금|계좌|통장)[^\n(]*\(\s*[vV✓☑○oO]\s*\)/.test(text);
  const directChecked = /직접\s*지급[^\n(]*\(\s*[vV✓☑○oO]\s*\)/.test(text);
  if (directChecked && !accountChecked) {
    draft.payMethod = '직접 지급';
    note('지급방법', '직접 지급');
  } else if (accountChecked || /계좌|통장에?\s*입금/.test(text)) {
    draft.payMethod = '근로자 명의 계좌 입금';
    note('지급방법', '계좌 입금');
  } else if (/직접\s*지급|현금/.test(text)) {
    draft.payMethod = '직접 지급';
    note('지급방법', '직접 지급');
  }

  // 사회보험: 체크 표시가 붙은 항목만
  for (const name of ['고용보험', '산재보험', '국민연금', '건강보험']) {
    const m = new RegExp(String.raw`([☑■▣●√✓vV]\s*)?\[?\s*([☑■▣●√✓vVxX ]?)\s*\]?\s*${name}`).exec(
      text,
    );
    if (m && (m[1] || /[☑■▣●√✓vVxX]/.test(m[2] ?? ''))) draft.insurance.push(name);
  }
  if (draft.insurance.length) note('사회보험', draft.insurance.join(', '));

  if (/교부/.test(text) && /사본|1부|한\s*부/.test(text)) {
    draft.copyProvided = true;
    note('계약서 교부', '교부 조항 있음');
  }

  const business = after(text, /사업체명|회사명|상호/, true);
  if (business) {
    draft.businessName = business;
    note('사업체명', business);
  }
  const employer = after(text, /대표자|사업주\s*성명/, true);
  if (employer) {
    draft.employerName = employer;
    note('사업주', employer);
  }
  const worker = after(text, /근로자\s*(?:성명|이름)/, true);
  if (worker) {
    draft.workerName = worker;
    note('근로자', worker);
  }

  return { draft, found, text };
}
