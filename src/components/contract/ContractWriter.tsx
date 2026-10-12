'use client';

import { useState } from 'react';
import { WEEKDAYS } from '@/lib/contract-check';
import styles from './contract.module.css';

const SOURCE_URL = 'https://www.moel.go.kr/mainpop2.do';
const WRITTEN_TERMS_URL =
  'https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0017&lsiSeq=232201&urlMode=lsScJoRltInfoR';
const INSURANCE = ['고용보험', '산재보험', '국민연금', '건강보험'] as const;

type Draft = {
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
  payUnit: '시급' | '일급' | '월급';
  basePay: string;
  wageCalculation: string;
  bonus: string;
  allowances: string;
  payCycle: '매일' | '매주' | '매월';
  payDay: string;
  payMethod: '근로자 명의 계좌 입금' | '직접 지급';
  insurance: string[];
  copyProvided: boolean;
};

const INITIAL_DRAFT: Draft = {
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
  wageCalculation: '',
  bonus: '',
  allowances: '',
  payCycle: '매월',
  payDay: '',
  payMethod: '근로자 명의 계좌 입금',
  insurance: [],
  copyProvided: false,
};

function display(value: string, fallback = '미입력') {
  return value.trim() || fallback;
}

function money(value: string) {
  const amount = Number(value);
  return value.trim() && Number.isFinite(amount) ? `${amount.toLocaleString('ko-KR')}원` : '미입력';
}

export function ContractWriter() {
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [showPreview, setShowPreview] = useState(false);

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  };

  const toggleList = (key: 'workdays' | 'insurance', value: string) => {
    setDraft((previous) => ({
      ...previous,
      [key]: previous[key].includes(value)
        ? previous[key].filter((item) => item !== value)
        : [...previous[key], value],
    }));
  };

  const requiredValues = [
    draft.employerName,
    draft.businessName,
    draft.businessAddress,
    draft.workerName,
    draft.workerAddress,
    draft.startDate,
    draft.workplace,
    draft.duties,
    draft.workStart,
    draft.workEnd,
    draft.weeklyHoliday,
    draft.basePay,
    draft.wageCalculation,
    draft.payDay,
  ];
  const completed =
    requiredValues.filter((value) => value.trim()).length +
    Number(draft.indefinite || Boolean(draft.endDate)) +
    Number(draft.workdays.length > 0 || Boolean(draft.workScheduleNote.trim())) +
    draft.workdays.filter((day) => Boolean(draft.dailyHours[day]?.trim())).length;
  const total = requiredValues.length + 2 + draft.workdays.length;
  const dateError =
    draft.startDate && draft.endDate && !draft.indefinite && draft.endDate < draft.startDate;

  return (
    <div className={styles.writer}>
      <div className={styles.conditionIntro}>
        <div>
          <span className={styles.writerEyebrow}>STANDARD EMPLOYMENT CONTRACT</span>
          <h2>표준근로계약서 작성 항목</h2>
          <p>
            고용노동부 표준근로계약서의 순서에 맞춰 계약 조건을 적어 보세요. 작성 내용은 이
            화면에서만 유지됩니다.
          </p>
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            고용노동부 표준근로계약서 작성방법 보기 ↗
          </a>
        </div>
        <div className={styles.completionBox}>
          <span>
            {completed} / {total}개 핵심 항목 입력
          </span>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="계약서 핵심 항목 입력률"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completed}
          >
            <span style={{ width: `${(completed / total) * 100}%` }} />
          </div>
        </div>
      </div>

      <form className={styles.writerForm} onSubmit={(event) => event.preventDefault()}>
        <section className={styles.writerSection}>
          <h3>01. 계약 당사자</h3>
          <p>사업주와 근로자의 정보는 계약서 끝의 서명란에도 쓰입니다.</p>
          <div className={styles.writerGrid}>
            <label>
              사업체명{' '}
              <input
                value={draft.businessName}
                onChange={(event) => setField('businessName', event.target.value)}
              />
            </label>
            <label>
              사업주 또는 대표자 성명{' '}
              <input
                value={draft.employerName}
                onChange={(event) => setField('employerName', event.target.value)}
              />
            </label>
            <label>
              사업장 주소{' '}
              <input
                value={draft.businessAddress}
                onChange={(event) => setField('businessAddress', event.target.value)}
              />
            </label>
            <label>
              사업장 전화번호{' '}
              <input
                type="tel"
                value={draft.businessPhone}
                onChange={(event) => setField('businessPhone', event.target.value)}
              />
            </label>
            <label>
              근로자 성명{' '}
              <input
                value={draft.workerName}
                onChange={(event) => setField('workerName', event.target.value)}
              />
            </label>
            <label>
              근로자 주소{' '}
              <input
                value={draft.workerAddress}
                onChange={(event) => setField('workerAddress', event.target.value)}
              />
            </label>
            <label>
              근로자 연락처{' '}
              <input
                type="tel"
                value={draft.workerPhone}
                onChange={(event) => setField('workerPhone', event.target.value)}
              />
            </label>
            <label>
              계약 체결일{' '}
              <input
                type="date"
                value={draft.signedDate}
                onChange={(event) => setField('signedDate', event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className={styles.writerSection}>
          <h3>02. 근로계약기간</h3>
          <p>기간을 정하지 않은 계약은 근로개시일만 기재합니다.</p>
          <div className={styles.writerGrid}>
            <label>
              근로개시일{' '}
              <input
                type="date"
                value={draft.startDate}
                onChange={(event) => setField('startDate', event.target.value)}
              />
            </label>
            <label>
              계약 종료일{' '}
              <input
                type="date"
                disabled={draft.indefinite}
                min={draft.startDate || undefined}
                value={draft.endDate}
                onChange={(event) => setField('endDate', event.target.value)}
              />
            </label>
          </div>
          <label className={styles.writerCheck}>
            <input
              type="checkbox"
              checked={draft.indefinite}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  indefinite: event.target.checked,
                  endDate: event.target.checked ? '' : previous.endDate,
                }))
              }
            />{' '}
            기간을 정하지 않음
          </label>
          {dateError && (
            <p className={styles.writerError} role="alert">
              계약 종료일은 근로개시일보다 빠를 수 없습니다.
            </p>
          )}
        </section>

        <section className={styles.writerSection}>
          <h3>03. 근무 장소와 업무</h3>
          <div className={styles.writerGrid}>
            <label>
              근무 장소{' '}
              <input
                value={draft.workplace}
                onChange={(event) => setField('workplace', event.target.value)}
                placeholder="일을 수행할 장소"
              />
            </label>
            <label>
              업무의 내용{' '}
              <input
                value={draft.duties}
                onChange={(event) => setField('duties', event.target.value)}
                placeholder="맡기로 한 업무"
              />
            </label>
          </div>
        </section>

        <section className={styles.writerSection}>
          <h3>04. 소정근로시간과 휴게시간</h3>
          <p>표준 양식에는 근로 시작·종료 시각과 근로 중 휴게 시작·종료 시각을 적습니다.</p>
          <div className={styles.writerGrid}>
            <label>
              근로 시작{' '}
              <input
                type="time"
                value={draft.workStart}
                onChange={(event) => setField('workStart', event.target.value)}
              />
            </label>
            <label>
              근로 종료{' '}
              <input
                type="time"
                value={draft.workEnd}
                onChange={(event) => setField('workEnd', event.target.value)}
              />
            </label>
            <label>
              휴게 시작{' '}
              <input
                type="time"
                value={draft.breakStart}
                onChange={(event) => setField('breakStart', event.target.value)}
              />
            </label>
            <label>
              휴게 종료{' '}
              <input
                type="time"
                value={draft.breakEnd}
                onChange={(event) => setField('breakEnd', event.target.value)}
              />
            </label>
          </div>
          <p className={styles.writerHint}>
            휴게시간은 근로시간 도중에 부여합니다. 4시간 근로 시 30분 이상, 8시간 근로 시 1시간
            이상을 확인하세요.
          </p>
        </section>

        <section className={styles.writerSection}>
          <h3>05. 근무일과 주휴일</h3>
          <fieldset className={styles.writerChoices}>
            <legend>매주 근무하는 요일</legend>
            <div>
              {WEEKDAYS.map((day) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={draft.workdays.includes(day)}
                    onChange={() => toggleList('workdays', day)}
                  />{' '}
                  {day}
                </label>
              ))}
            </div>
          </fieldset>
          {draft.workdays.length > 0 && (
            <div className={styles.writerDailyHours}>
              <strong>근로일별 소정근로시간</strong>
              <div className={styles.writerGrid}>
                {draft.workdays.map((day) => (
                  <label key={day}>
                    {day} 근로시간 (시간)
                    <input
                      type="number"
                      min="0.5"
                      max="24"
                      step="0.5"
                      inputMode="decimal"
                      value={draft.dailyHours[day] ?? ''}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          dailyHours: { ...previous.dailyHours, [day]: event.target.value },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
          <label className={styles.writerSingleField}>
            근무일이 일정하지 않은 경우
            <input
              value={draft.workScheduleNote}
              onChange={(event) => setField('workScheduleNote', event.target.value)}
              placeholder="예: 매주 5일, 근무표에 따라 요일 결정"
            />
          </label>
          <label className={styles.writerSingleField}>
            매주 주휴일
            <select
              value={draft.weeklyHoliday}
              onChange={(event) => setField('weeklyHoliday', event.target.value)}
            >
              <option value="">요일 선택</option>
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <p className={styles.writerHint}>
            단시간근로자의 계약서에는 근로일과 근로일별 근로시간을 서면으로 명시해야 합니다.{' '}
            <a href={WRITTEN_TERMS_URL} target="_blank" rel="noopener noreferrer">
              기간제법 제17조 확인 ↗
            </a>
          </p>
        </section>

        <section className={styles.writerSection}>
          <h3>06. 임금</h3>
          <div className={styles.writerGrid}>
            <label>
              임금 단위
              <select
                value={draft.payUnit}
                onChange={(event) => setField('payUnit', event.target.value as Draft['payUnit'])}
              >
                <option>시급</option>
                <option>일급</option>
                <option>월급</option>
              </select>
            </label>
            <label>
              기본 임금 (원){' '}
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.basePay}
                onChange={(event) => setField('basePay', event.target.value)}
              />
            </label>
            <label>
              임금 계산방법
              <input
                value={draft.wageCalculation}
                onChange={(event) => setField('wageCalculation', event.target.value)}
                placeholder="예: 시급 × 실제 근로시간"
              />
            </label>
            <label>
              상여금 내용과 금액{' '}
              <input
                value={draft.bonus}
                onChange={(event) => setField('bonus', event.target.value)}
                placeholder="없으면 비워두세요"
              />
            </label>
            <label>
              기타 급여·수당 내용과 금액{' '}
              <input
                value={draft.allowances}
                onChange={(event) => setField('allowances', event.target.value)}
                placeholder="예: 식대 월 100,000원"
              />
            </label>
            <label>
              임금 지급 주기
              <select
                value={draft.payCycle}
                onChange={(event) => setField('payCycle', event.target.value as Draft['payCycle'])}
              >
                <option>매일</option>
                <option>매주</option>
                <option>매월</option>
              </select>
            </label>
            <label>
              임금 지급일{' '}
              <input
                value={draft.payDay}
                onChange={(event) => setField('payDay', event.target.value)}
                placeholder={draft.payCycle === '매월' ? '예: 10일 또는 말일' : '예: 금요일'}
              />
            </label>
            <label>
              지급방법
              <select
                value={draft.payMethod}
                onChange={(event) =>
                  setField('payMethod', event.target.value as Draft['payMethod'])
                }
              >
                <option>근로자 명의 계좌 입금</option>
                <option>직접 지급</option>
              </select>
            </label>
          </div>
          <p className={styles.writerHint}>
            상여금과 기타 수당이 있다면 지급 조건과 금액을 구체적으로 적으세요. 고용노동부 표준
            양식은 임금 지급일이 휴일이면 전일에 지급하도록 적고 있습니다.
          </p>
        </section>

        <section className={styles.writerSection}>
          <h3>07. 연차유급휴가</h3>
          <p>연차유급휴가는 근로기준법에서 정하는 바에 따라 부여합니다.</p>
        </section>

        <section className={styles.writerSection}>
          <h3>08. 사회보험 적용 여부</h3>
          <p>해당하는 보험을 각각 선택하세요.</p>
          <fieldset className={styles.writerChoices}>
            <legend className={styles.visuallyHidden}>사회보험</legend>
            <div>
              {INSURANCE.map((name) => (
                <label key={name}>
                  <input
                    type="checkbox"
                    checked={draft.insurance.includes(name)}
                    onChange={() => toggleList('insurance', name)}
                  />{' '}
                  {name}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className={styles.writerSection}>
          <h3>09. 계약서 교부와 성실한 이행</h3>
          <p>
            사업주는 계약 체결과 동시에 근로자에게 계약서 사본을 교부합니다. 양측은
            근로계약·취업규칙·단체협약을 성실하게 이행합니다.
          </p>
          <label className={styles.writerCheck}>
            <input
              type="checkbox"
              checked={draft.copyProvided}
              onChange={(event) => setField('copyProvided', event.target.checked)}
            />{' '}
            계약 체결 시 근로자에게 계약서 사본을 교부합니다.
          </label>
        </section>

        <section className={styles.writerSection}>
          <h3>10. 기타 및 서명</h3>
          <p>
            계약에 정함이 없는 사항은 근로기준법령에 따릅니다. 완성한 계약서는 사업주와 근로자가
            내용을 확인하고 각각 서명해야 합니다.
          </p>
          <p className={styles.writerHint}>
            이 화면은 작성 항목을 정리하는 초안입니다. 서명과 계약서 교부는 별도로 진행하세요.
          </p>
        </section>
      </form>

      <div className={styles.writerActions}>
        <button type="button" onClick={() => setShowPreview((value) => !value)}>
          {showPreview ? '미리보기 닫기' : '작성 내용 미리보기'}
        </button>
        <span>
          핵심 항목 {completed}/{total}개 입력 · 이 화면을 닫으면 내용이 사라집니다.
        </span>
      </div>

      {showPreview && (
        <section className={styles.writerPreview} aria-label="근로계약서 작성 내용 미리보기">
          <h3>근로계약서 작성 내용 미리보기</h3>
          <p>
            {display(draft.businessName)} (사업주 {display(draft.employerName)})와{' '}
            {display(draft.workerName)} (근로자)는 다음 조건을 확인합니다.
          </p>
          <ol>
            <li>
              <strong>근로계약기간</strong> {display(draft.startDate)}부터{' '}
              {draft.indefinite ? '기간의 정함 없음' : `${display(draft.endDate)}까지`}
            </li>
            <li>
              <strong>근무 장소·업무</strong> {display(draft.workplace)} / {display(draft.duties)}
            </li>
            <li>
              <strong>소정근로시간·휴게시간</strong> {display(draft.workStart)}~
              {display(draft.workEnd)} / 휴게 {display(draft.breakStart)}~{display(draft.breakEnd)}
            </li>
            <li>
              <strong>근무일·주휴일</strong>{' '}
              {[
                draft.workdays
                  .map((day) =>
                    draft.dailyHours[day]
                      ? `${day} ${draft.dailyHours[day]}시간`
                      : `${day} 시간 미입력`,
                  )
                  .join(', '),
                draft.workScheduleNote.trim(),
              ]
                .filter(Boolean)
                .join(' · ') || '미입력'}{' '}
              / 주휴일 {display(draft.weeklyHoliday)}
            </li>
            <li>
              <strong>임금</strong> {draft.payUnit} {money(draft.basePay)} · 상여금{' '}
              {display(draft.bonus, '없음')} · 기타 급여 {display(draft.allowances, '없음')} ·{' '}
              계산방법 {display(draft.wageCalculation)} · {draft.payCycle} {display(draft.payDay)}{' '}
              지급 · {draft.payMethod}
            </li>
            <li>
              <strong>연차유급휴가</strong> 근로기준법에서 정하는 바에 따라 부여
            </li>
            <li>
              <strong>사회보험 적용</strong>{' '}
              {draft.insurance.length ? draft.insurance.join(', ') : '선택 없음'}
            </li>
            <li>
              <strong>계약서 교부</strong> {draft.copyProvided ? '계약 체결 시 교부' : '확인 필요'}
            </li>
            <li>
              <strong>성실한 이행</strong> 당사자는 근로계약·취업규칙·단체협약을 성실하게 이행
            </li>
            <li>
              <strong>기타</strong> 정함이 없는 사항은 근로기준법령에 따름
            </li>
          </ol>
          <p>계약 체결일: {display(draft.signedDate)}</p>
          <p>
            사업주: {display(draft.businessName)} / {display(draft.employerName)} /{' '}
            {display(draft.businessAddress)} / {display(draft.businessPhone)} (서명)
          </p>
          <p>
            근로자: {display(draft.workerName)} / {display(draft.workerAddress)} /{' '}
            {display(draft.workerPhone)} (서명)
          </p>
          <p className={styles.writerHint}>
            고용노동부 표준근로계약서 작성방법을 참고한 미리보기입니다. 출력·서명된 계약서는
            아닙니다.
          </p>
        </section>
      )}
    </div>
  );
}
