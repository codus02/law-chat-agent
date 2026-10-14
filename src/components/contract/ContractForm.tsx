'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import {
  checkDraft,
  CONFIRMATIONS,
  formatHours,
  INSURANCE,
  MINIMUM_WAGE_2026,
  SECTION_TITLES,
  summarize,
  WEEKDAYS,
  type Draft,
  type Finding,
  type Section,
} from '@/lib/contract-draft';
import { cx } from '@/lib/cx';
import { formatNumber } from '@/lib/format';
import styles from './contract-studio.module.css';

const SOURCE_URL = 'https://www.moel.go.kr/mainpop2.do';
const WRITTEN_TERMS_URL =
  'https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0017&lsiSeq=232201&urlMode=lsScJoRltInfoR';

const TONE_LABEL = { danger: '경고', warning: '확인', info: '참고', ok: '충족' } as const;

function display(value: string, fallback = '미입력') {
  return value.trim() || fallback;
}

function Findings({ items }: { items: Finding[] }) {
  if (items.length === 0) return null;
  return (
    <ul className={styles.findings}>
      {items.map((item) => (
        <li key={item.title} className={cx(styles.finding, styles[item.tone])}>
          <span className={styles.findingTone}>{TONE_LABEL[item.tone]}</span>
          <div>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
            {item.basis && <small>근거 · {item.basis}</small>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ContractForm({
  draft,
  onChange,
  importedFrom,
  onReset,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  importedFrom: string | null;
  onReset: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);

  // 브라우저 인쇄 대화상자에서 "PDF로 저장"을 고르면 미리보기 부분만 PDF가 된다(@media print).
  const saveAsPdf = () => {
    setShowPreview(true);
    window.setTimeout(() => window.print(), 150);
  };
  const { findings, derived } = useMemo(() => checkDraft(draft), [draft]);
  const summary = summarize(findings);
  const bySection = (section: Section) => findings.filter((f) => f.section === section);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    onChange({ ...draft, [key]: value });
  const toggle = (key: 'workdays' | 'insurance', value: string) =>
    set(
      key,
      draft[key].includes(value) ? draft[key].filter((v) => v !== value) : [...draft[key], value],
    );

  const fieldState = (section: Section) => {
    const items = bySection(section);
    if (items.some((f) => f.tone === 'danger')) return styles.sectionDanger;
    if (items.some((f) => f.tone === 'warning')) return styles.sectionWarning;
    if (items.some((f) => f.tone === 'ok')) return styles.sectionOk;
    return '';
  };

  return (
    <div className={styles.formLayout}>
      <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
        {importedFrom && (
          <div className={styles.importedNote} role="status">
            <strong>{importedFrom}</strong>에서 읽은 내용으로 채웠어요. 잘못 읽은 값은 고치고, 비어
            있는 항목은 계약서를 보며 채워 주세요.
            <button type="button" onClick={onReset}>
              비우고 새로 작성
            </button>
          </div>
        )}

        <section className={cx(styles.section, fieldState('period'))}>
          <header>
            <h3>01 근로계약기간</h3>
            <p>기간을 정하지 않으면 근로개시일만 적어요.</p>
          </header>
          <div className={styles.grid}>
            <label>
              근로개시일
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </label>
            <label>
              계약 종료일
              <input
                type="date"
                disabled={draft.indefinite}
                min={draft.startDate || undefined}
                value={draft.endDate}
                onChange={(e) => set('endDate', e.target.value)}
              />
            </label>
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={draft.indefinite}
              onChange={(e) =>
                onChange({
                  ...draft,
                  indefinite: e.target.checked,
                  endDate: e.target.checked ? '' : draft.endDate,
                })
              }
            />
            기간을 정하지 않음
          </label>
          <Findings items={bySection('period')} />
        </section>

        <section className={cx(styles.section, fieldState('place'))}>
          <header>
            <h3>02 근무 장소와 업무</h3>
          </header>
          <div className={styles.grid}>
            <label>
              근무 장소
              <input
                value={draft.workplace}
                onChange={(e) => set('workplace', e.target.value)}
                placeholder="예: ○○편의점 ○○점"
              />
            </label>
            <label>
              업무의 내용
              <input
                value={draft.duties}
                onChange={(e) => set('duties', e.target.value)}
                placeholder="예: 계산, 진열, 매장 정리"
              />
            </label>
          </div>
          <Findings items={bySection('place')} />
        </section>

        <section className={cx(styles.section, fieldState('hours'))}>
          <header>
            <h3>03 소정근로시간과 휴게시간</h3>
            <p>근로 시작·종료 시각과, 근로 도중의 휴게 시작·종료 시각을 적어요.</p>
          </header>
          <div className={styles.grid}>
            <label>
              근로 시작
              <input
                type="time"
                value={draft.workStart}
                onChange={(e) => set('workStart', e.target.value)}
              />
            </label>
            <label>
              근로 종료
              <input
                type="time"
                value={draft.workEnd}
                onChange={(e) => set('workEnd', e.target.value)}
              />
            </label>
            <label>
              휴게 시작
              <input
                type="time"
                value={draft.breakStart}
                onChange={(e) => set('breakStart', e.target.value)}
              />
            </label>
            <label>
              휴게 종료
              <input
                type="time"
                value={draft.breakEnd}
                onChange={(e) => set('breakEnd', e.target.value)}
              />
            </label>
          </div>
          {derived.dailyWorkHours !== null && (
            <p className={styles.derived}>
              하루 근로 <strong>{formatHours(derived.dailyWorkHours)}시간</strong>
              {derived.breakMinutes !== null && ` · 휴게 ${derived.breakMinutes}분`}
            </p>
          )}
          <Findings items={bySection('hours')} />
        </section>

        <section className={cx(styles.section, fieldState('days'))}>
          <header>
            <h3>04 근무일과 주휴일</h3>
            <p>
              단시간 근로자는 근로일과 근로일별 근로시간을 적어야 해요.{' '}
              <a href={WRITTEN_TERMS_URL} target="_blank" rel="noopener noreferrer">
                기간제법 제17조 ↗
              </a>
            </p>
          </header>
          <div className={styles.chips} role="group" aria-label="근무 요일">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={cx(styles.chip, draft.workdays.includes(day) && styles.isOn)}
                aria-pressed={draft.workdays.includes(day)}
                onClick={() => toggle('workdays', day)}
              >
                {day.slice(0, 1)}
              </button>
            ))}
          </div>
          {draft.workdays.length > 0 && (
            <div className={styles.dailyHours}>
              {WEEKDAYS.filter((day) => draft.workdays.includes(day)).map((day) => (
                <label key={day}>
                  {day.slice(0, 1)}요일 근로시간
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    inputMode="decimal"
                    placeholder={
                      derived.dailyWorkHours ? formatHours(derived.dailyWorkHours) : '시간'
                    }
                    value={draft.dailyHours[day] ?? ''}
                    onChange={(e) =>
                      set('dailyHours', { ...draft.dailyHours, [day]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
          )}
          <div className={styles.grid}>
            <label>
              근무일이 일정하지 않은 경우
              <input
                value={draft.workScheduleNote}
                onChange={(e) => set('workScheduleNote', e.target.value)}
                placeholder="예: 매주 5일, 근무표에 따라 정함"
              />
            </label>
            <label>
              매주 주휴일
              <select
                value={draft.weeklyHoliday}
                onChange={(e) => set('weeklyHoliday', e.target.value)}
              >
                <option value="">요일 선택</option>
                {WEEKDAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {derived.weeklyHours !== null && (
            <p className={styles.derived}>
              주 소정근로 <strong>{formatHours(derived.weeklyHours)}시간</strong>
              {derived.paidHolidayHours > 0 &&
                ` · 주휴 ${formatHours(derived.paidHolidayHours)}시간`}
              {derived.monthlyHours && ` · 월 환산 ${Math.round(derived.monthlyHours)}시간`}
            </p>
          )}
          <Findings items={bySection('days')} />
        </section>

        <section className={cx(styles.section, fieldState('wage'))}>
          <header>
            <h3>05 임금</h3>
            <p>
              2026년 최저임금은 시급 {formatNumber(MINIMUM_WAGE_2026)}원이에요. 월급·일급은
              근로시간으로 환산해 비교해요.
            </p>
          </header>
          <div className={styles.grid}>
            <label>
              임금 단위
              <select
                value={draft.payUnit}
                onChange={(e) => set('payUnit', e.target.value as Draft['payUnit'])}
              >
                <option>시급</option>
                <option>일급</option>
                <option>월급</option>
              </select>
            </label>
            <label>
              기본 임금 (원)
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={draft.basePay}
                onChange={(e) => set('basePay', e.target.value)}
              />
            </label>
            <label>
              임금 계산방법
              <input
                value={draft.wageCalculation}
                onChange={(e) => set('wageCalculation', e.target.value)}
                placeholder="예: 시급 × 실제 근로시간"
              />
            </label>
            <label>
              상여금
              <input
                value={draft.bonus}
                onChange={(e) => set('bonus', e.target.value)}
                placeholder="없으면 비워 두세요"
              />
            </label>
            <label>
              기타 급여·수당
              <input
                value={draft.allowances}
                onChange={(e) => set('allowances', e.target.value)}
                placeholder="예: 식대 월 100,000원"
              />
            </label>
            <label>
              지급 주기
              <select
                value={draft.payCycle}
                onChange={(e) => set('payCycle', e.target.value as Draft['payCycle'])}
              >
                <option>매일</option>
                <option>매주</option>
                <option>매월</option>
              </select>
            </label>
            <label>
              임금 지급일
              <input
                value={draft.payDay}
                onChange={(e) => set('payDay', e.target.value)}
                placeholder={draft.payCycle === '매월' ? '예: 10일, 말일' : '예: 금요일'}
              />
            </label>
            <label>
              지급방법
              <select
                value={draft.payMethod}
                onChange={(e) => set('payMethod', e.target.value as Draft['payMethod'])}
              >
                <option>근로자 명의 계좌 입금</option>
                <option>직접 지급</option>
              </select>
            </label>
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={draft.probation}
              onChange={(e) => set('probation', e.target.checked)}
            />
            수습 기간 감액 조항이 있어요
          </label>
          <Findings items={bySection('wage')} />
        </section>

        <section className={styles.section}>
          <header>
            <h3>06 연차유급휴가</h3>
            <p>
              연차유급휴가는 근로기준법에서 정하는 바에 따라 부여해요. 1년 미만은 1개월 개근마다
              1일이 생겨요.
            </p>
          </header>
        </section>

        <section className={cx(styles.section, fieldState('insurance'))}>
          <header>
            <h3>07 사회보험 적용</h3>
          </header>
          <div className={styles.chips} role="group" aria-label="사회보험">
            {INSURANCE.map((name) => (
              <button
                key={name}
                type="button"
                className={cx(styles.chip, draft.insurance.includes(name) && styles.isOn)}
                aria-pressed={draft.insurance.includes(name)}
                onClick={() => toggle('insurance', name)}
              >
                {name}
              </button>
            ))}
          </div>
          <Findings items={bySection('insurance')} />
        </section>

        <section className={cx(styles.section, fieldState('copy'))}>
          <header>
            <h3>08 계약서 교부와 서명</h3>
            <p>
              계약서는 사업주와 근로자가 각각 서명하고, 근로자가 한 부를 받아요. 이름과 날짜는 선택
              항목이에요. 적으면 미리보기와 PDF에 들어가요.
            </p>
          </header>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={draft.copyProvided}
              onChange={(e) => set('copyProvided', e.target.checked)}
            />
            계약 체결 시 근로자에게 계약서 사본을 교부해요
          </label>
          <div className={styles.grid}>
            <label>
              사업체명 (선택)
              <input
                value={draft.businessName}
                onChange={(e) => set('businessName', e.target.value)}
              />
            </label>
            <label>
              사업주(대표자) 성명 (선택)
              <input
                value={draft.employerName}
                onChange={(e) => set('employerName', e.target.value)}
              />
            </label>
            <label>
              근로자 성명 (선택)
              <input value={draft.workerName} onChange={(e) => set('workerName', e.target.value)} />
            </label>
            <label>
              계약 체결일 (선택)
              <input
                type="date"
                value={draft.signedDate}
                onChange={(e) => set('signedDate', e.target.value)}
              />
            </label>
          </div>
          <Findings items={bySection('copy')} />
        </section>

        <section className={styles.section}>
          <header>
            <h3>09 체결 전 직접 확인</h3>
          </header>
          <ul className={styles.confirmList}>
            {CONFIRMATIONS.map((item) => (
              <li key={item.key}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={draft.confirmations[item.key]}
                    onChange={(e) =>
                      set('confirmations', { ...draft.confirmations, [item.key]: e.target.checked })
                    }
                  />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.text}</small>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </form>

      <aside className={styles.summary} aria-label="점검 결과 요약">
        <div className={styles.summaryHead}>
          <strong>점검 결과</strong>
          <small>입력할 때마다 바로 바뀌어요</small>
        </div>
        <div className={styles.counts}>
          <span className={styles.danger}>경고 {summary.danger}</span>
          <span className={styles.warning}>확인 {summary.warning}</span>
          <span className={styles.ok}>충족 {summary.ok}</span>
        </div>
        <ol className={styles.summaryList}>
          {findings
            .filter((f) => f.tone === 'danger' || f.tone === 'warning')
            .map((f) => (
              <li key={f.title} className={styles[f.tone]}>
                <small>{SECTION_TITLES[f.section]}</small>
                <span>{f.title}</span>
              </li>
            ))}
          {summary.danger + summary.warning === 0 && (
            <li className={styles.ok}>
              경고·확인 항목이 없어요. 아래 미리보기로 내용을 확인하세요.
            </li>
          )}
        </ol>
        <button
          className={styles.previewButton}
          type="button"
          onClick={() => setShowPreview((v) => !v)}
        >
          <Icon name="contract" size={16} />{' '}
          {showPreview ? '미리보기 닫기' : '계약서 문구로 미리보기'}
        </button>
        <button className={styles.printButton} type="button" onClick={saveAsPdf}>
          <Icon name="upload" size={16} /> PDF로 저장
        </button>
        <p className={styles.summaryNote}>
          고용노동부{' '}
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            표준근로계약서 작성방법 ↗
          </a>
          의 항목 순서를 따랐어요. 점검은 조문 기준의 참고용이며, 입력 내용은 이 화면에만 남아요.
        </p>
      </aside>

      {showPreview && (
        <section className={styles.preview} aria-label="근로계약서 미리보기">
          <h3>표준근로계약서 (초안)</h3>
          <p>
            {display(draft.businessName)}(이하 “사업주”라 함)과(와) {display(draft.workerName)}(이하
            “근로자”라 함)은 다음과 같이 근로계약을 체결한다.
          </p>
          <ol>
            <li>
              <strong>근로계약기간</strong> {display(draft.startDate)}부터{' '}
              {draft.indefinite ? '기간의 정함 없음' : `${display(draft.endDate)}까지`}
            </li>
            <li>
              <strong>근무장소</strong> {display(draft.workplace)}
            </li>
            <li>
              <strong>업무의 내용</strong> {display(draft.duties)}
            </li>
            <li>
              <strong>소정근로시간</strong> {display(draft.workStart)}부터 {display(draft.workEnd)}
              까지 (휴게시간 {display(draft.breakStart)}~{display(draft.breakEnd)})
            </li>
            <li>
              <strong>근무일/휴일</strong>{' '}
              {[
                draft.workdays
                  .map((day) =>
                    draft.dailyHours[day] ? `${day} ${draft.dailyHours[day]}시간` : day,
                  )
                  .join(', '),
                draft.workScheduleNote.trim(),
              ]
                .filter(Boolean)
                .join(' · ') || '미입력'}
              , 주휴일 매주 {display(draft.weeklyHoliday)}
            </li>
            <li>
              <strong>임금</strong> {draft.payUnit}{' '}
              {draft.basePay ? `${formatNumber(Number(draft.basePay))}원` : '미입력'} · 상여금{' '}
              {display(draft.bonus, '없음')} · 기타급여 {display(draft.allowances, '없음')} ·{' '}
              {draft.payCycle} {display(draft.payDay)} 지급 · {draft.payMethod}
              {draft.probation && ' · 수습 감액 조항 있음'}
            </li>
            <li>
              <strong>연차유급휴가</strong> 근로기준법에서 정하는 바에 따라 부여
            </li>
            <li>
              <strong>사회보험 적용여부</strong>{' '}
              {draft.insurance.length ? draft.insurance.join(', ') : '선택 없음'}
            </li>
            <li>
              <strong>근로계약서 교부</strong>{' '}
              {draft.copyProvided ? '계약 체결과 동시에 근로자에게 교부' : '확인 필요'}
            </li>
            <li>
              <strong>기타</strong> 이 계약에 정함이 없는 사항은 근로기준법령에 의함
            </li>
          </ol>
          <p>
            {display(draft.signedDate)} · 사업주 {display(draft.businessName)}{' '}
            {display(draft.employerName)} (서명) · 근로자 {display(draft.workerName)} (서명)
          </p>
          <small>작성 항목을 정리한 초안이며 서명·교부된 계약서가 아니에요.</small>
        </section>
      )}
    </div>
  );
}
