'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@/components/common/Icon';
import {
  checkDraft,
  CONFIRMATIONS,
  formatHours,
  requiredBreakMinutes,
  INSURANCE,
  MINIMUM_WAGE_2026,
  SECTION_TITLES,
  summarize,
  WEEKDAYS,
  type Draft,
  type FieldKey,
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

/**
 * 종이 계약서의 한 줄: 왼쪽 항목명, 오른쪽 내용. 항목명 아래에 경고·확인 개수를 붙여
 * 어느 줄을 고쳐야 하는지 훑어볼 수 있게 한다.
 */
function Row({
  no,
  title,
  section,
  items,
  hint,
  children,
}: {
  no: number;
  title: string;
  section: Section;
  items: Finding[];
  hint?: ReactNode;
  children: ReactNode;
}) {
  const danger = items.filter((f) => f.tone === 'danger').length;
  const warning = items.filter((f) => f.tone === 'warning').length;
  return (
    <section id={`row-${section}`} className={cx(styles.row, danger > 0 && styles.rowDanger)}>
      <div className={styles.rowHead}>
        <h3>
          <span className={styles.rowNo}>{no}.</span>
          {title}
        </h3>
        {(danger > 0 || warning > 0) && (
          <p className={styles.rowFlags}>
            {danger > 0 && <span className={styles.danger}>경고 {danger}</span>}
            {warning > 0 && <span className={styles.warning}>확인 {warning}</span>}
          </p>
        )}
      </div>
      <div className={styles.rowBody}>
        {hint && <p className={styles.hint}>{hint}</p>}
        {children}
        <Findings items={items} />
      </div>
    </section>
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

  // 입력칸마다 가장 심각한 점검 결과. 빈 칸 안내는 그 칸을 한 번 지나간 뒤에만 띄워,
  // 처음 연 화면이 온통 빨갛지 않게 한다. 값을 넣은 칸의 문제는 바로 보여 준다.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const fieldIssues = useMemo(() => {
    const issues = new Map<FieldKey, Finding>();
    for (const finding of findings) {
      if (finding.tone !== 'danger' && finding.tone !== 'warning') continue;
      for (const key of finding.fields ?? []) {
        const current = issues.get(key);
        if (!current || (current.tone === 'warning' && finding.tone === 'danger')) {
          issues.set(key, finding);
        }
      }
    }
    return issues;
  }, [findings]);
  const hasValue = (key: FieldKey) => {
    if (key.startsWith('daily:')) return Boolean(draft.dailyHours[key.slice(6)]?.trim());
    const value = draft[key as keyof Draft];
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return value === true;
  };
  const issueOf = (key: FieldKey) => {
    const issue = fieldIssues.get(key);
    if (!issue) return null;
    // 값을 넣은 칸 때문에 생긴 경고(예: 5시간 근무인데 휴게 없음)는 같이 고칠 빈 칸도 바로 표시한다.
    const caused =
      issue.tone === 'danger' && [...(issue.fields ?? []), ...(issue.causes ?? [])].some(hasValue);
    return importedFrom || touched.has(key) || hasValue(key) || caused ? issue : null;
  };
  const noteId = (key: FieldKey) => `field-note-${key.replace(':', '-')}`;
  /** 입력칸에 붙이는 속성: 강조 테두리, 스크린리더용 오류 표시와 안내 연결 */
  const field = (key: FieldKey) => {
    const issue = issueOf(key);
    return {
      'data-field': key,
      className: issue ? (issue.tone === 'danger' ? styles.isDanger : styles.isWarning) : undefined,
      'aria-invalid': issue?.tone === 'danger' ? true : undefined,
      'aria-describedby': issue ? noteId(key) : undefined,
    };
  };
  /** 여러 칸을 묶은 영역(요일 칸, 체크박스)의 강조 */
  const groupTone = (key: FieldKey) => {
    const issue = issueOf(key);
    if (!issue) return undefined;
    return issue.tone === 'danger' ? styles.groupDanger : styles.groupWarning;
  };
  /** 칸 바로 아래 짧은 안내. 좁은 요일 칸에는 필요한 휴게만 적는다. */
  const note = (key: FieldKey) => {
    const issue = issueOf(key);
    if (!issue) return null;
    let text = issue.title;
    if (key.startsWith('daily:')) {
      const hours = Number(draft.dailyHours[key.slice(6)]);
      text = issue.title.includes('휴게')
        ? `휴게 ${requiredBreakMinutes(hours)}분 이상 필요`
        : '시간을 적으세요';
    }
    return (
      <small id={noteId(key)} className={cx(styles.fieldNote, styles[issue.tone])}>
        {TONE_LABEL[issue.tone]} · {text}
      </small>
    );
  };
  const markTouched = (target: EventTarget) => {
    const key = (target as HTMLElement).closest?.('[data-field]')?.getAttribute('data-field');
    if (key && !touched.has(key)) setTouched(new Set(touched).add(key));
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    onChange({ ...draft, [key]: value });
  const toggle = (key: 'workdays' | 'insurance', value: string) =>
    set(
      key,
      draft[key].includes(value) ? draft[key].filter((v) => v !== value) : [...draft[key], value],
    );

  return (
    <div className={styles.formLayout}>
      <form
        className={styles.form}
        onSubmit={(event) => event.preventDefault()}
        onBlurCapture={(event) => markTouched(event.target)}
      >
        {importedFrom && (
          <div className={styles.importedNote} role="status">
            <strong>{importedFrom}</strong>에서 읽은 내용으로 채웠어요. 잘못 읽은 값은 고치고, 비어
            있는 항목은 계약서를 보며 채워 주세요.
            <button type="button" onClick={onReset}>
              비우고 새로 작성
            </button>
          </div>
        )}

        <div className={styles.sheet}>
          <div className={styles.sheetHead}>
            <strong>표준근로계약서</strong>
            <span>고용노동부 양식 항목 순서</span>
          </div>

          <Row
            no={1}
            title="근로계약기간"
            section="period"
            items={bySection('period')}
            hint="기간을 정하지 않으면 근로개시일만 적어요."
          >
            <div className={styles.grid}>
              <label>
                근로개시일
                <input
                  type="date"
                  {...field('startDate')}
                  value={draft.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
                {note('startDate')}
              </label>
              <label>
                계약 종료일
                <input
                  type="date"
                  disabled={draft.indefinite}
                  min={draft.startDate || undefined}
                  {...field('endDate')}
                  value={draft.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                />
                {note('endDate')}
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
          </Row>

          <Row no={2} title="근무 장소와 업무" section="place" items={bySection('place')}>
            <div className={styles.grid}>
              <label>
                근무 장소
                <input
                  {...field('workplace')}
                  value={draft.workplace}
                  onChange={(e) => set('workplace', e.target.value)}
                  placeholder="예: ○○편의점 ○○점"
                />
                {note('workplace')}
              </label>
              <label>
                업무의 내용
                <input
                  {...field('duties')}
                  value={draft.duties}
                  onChange={(e) => set('duties', e.target.value)}
                  placeholder="예: 계산, 진열, 매장 정리"
                />
                {note('duties')}
              </label>
            </div>
          </Row>

          <Row
            no={3}
            title="소정근로시간과 휴게"
            section="hours"
            items={bySection('hours')}
            hint="근로 시작·종료 시각과, 근로 도중의 휴게 시작·종료 시각을 적어요."
          >
            <div className={styles.grid}>
              <label>
                근로 시작
                <input
                  type="time"
                  {...field('workStart')}
                  value={draft.workStart}
                  onChange={(e) => set('workStart', e.target.value)}
                />
                {note('workStart')}
              </label>
              <label>
                근로 종료
                <input
                  type="time"
                  {...field('workEnd')}
                  value={draft.workEnd}
                  onChange={(e) => set('workEnd', e.target.value)}
                />
                {note('workEnd')}
              </label>
              <label>
                휴게 시작
                <input
                  type="time"
                  {...field('breakStart')}
                  value={draft.breakStart}
                  onChange={(e) => set('breakStart', e.target.value)}
                />
                {note('breakStart')}
              </label>
              <label>
                휴게 종료
                <input
                  type="time"
                  {...field('breakEnd')}
                  value={draft.breakEnd}
                  onChange={(e) => set('breakEnd', e.target.value)}
                />
                {note('breakEnd')}
              </label>
            </div>
            {derived.dailyWorkHours !== null && (
              <p className={styles.derived}>
                하루 근로 <strong>{formatHours(derived.dailyWorkHours)}시간</strong>
                {derived.breakMinutes !== null && ` · 휴게 ${derived.breakMinutes}분`}
              </p>
            )}
          </Row>

          <Row
            no={4}
            title="근무일과 주휴일"
            section="days"
            items={bySection('days')}
            hint={
              <>
                단시간 근로자는 근로일과 근로일별 근로시간을 적어야 해요.{' '}
                <a href={WRITTEN_TERMS_URL} target="_blank" rel="noopener noreferrer">
                  기간제법 제17조 ↗
                </a>
              </>
            }
          >
            <div
              className={cx(styles.days, groupTone('workdays'))}
              role="group"
              aria-label="근무 요일"
              data-field="workdays"
            >
              {WEEKDAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={cx(draft.workdays.includes(day) && styles.isOn)}
                  aria-pressed={draft.workdays.includes(day)}
                  onClick={() => toggle('workdays', day)}
                >
                  {day.slice(0, 1)}
                </button>
              ))}
            </div>
            {note('workdays')}
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
                      {...field(`daily:${day}`)}
                      value={draft.dailyHours[day] ?? ''}
                      onChange={(e) =>
                        set('dailyHours', { ...draft.dailyHours, [day]: e.target.value })
                      }
                    />
                    {note(`daily:${day}`)}
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
                  {...field('weeklyHoliday')}
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
                {note('weeklyHoliday')}
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
          </Row>

          <Row
            no={5}
            title="임금"
            section="wage"
            items={bySection('wage')}
            hint={`2026년 최저임금은 시급 ${formatNumber(MINIMUM_WAGE_2026)}원이에요. 월급·일급은 근로시간으로 환산해 비교해요.`}
          >
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
                  {...field('basePay')}
                  value={draft.basePay}
                  onChange={(e) => set('basePay', e.target.value)}
                />
                {note('basePay')}
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
                  {...field('payDay')}
                  value={draft.payDay}
                  onChange={(e) => set('payDay', e.target.value)}
                  placeholder={draft.payCycle === '매월' ? '예: 10일, 말일' : '예: 금요일'}
                />
                {note('payDay')}
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
          </Row>

          <Row no={6} title="연차유급휴가" section="leave" items={bySection('leave')}>
            <p className={styles.fixedText}>
              근로기준법에서 정하는 바에 따라 부여해요. 1년 미만은 1개월 개근마다 1일이 생겨요.
            </p>
          </Row>

          <Row no={7} title="사회보험 적용" section="insurance" items={bySection('insurance')}>
            <div
              className={cx(styles.checkRow, groupTone('insurance'))}
              role="group"
              aria-label="사회보험"
              data-field="insurance"
            >
              {INSURANCE.map((name) => (
                <label key={name} className={styles.check}>
                  <input
                    type="checkbox"
                    checked={draft.insurance.includes(name)}
                    onChange={() => toggle('insurance', name)}
                  />
                  {name}
                </label>
              ))}
            </div>
            {note('insurance')}
          </Row>

          <Row
            no={8}
            title="계약서 교부와 서명"
            section="copy"
            items={bySection('copy')}
            hint="사업주와 근로자가 각각 서명하고 근로자가 한 부를 받아요. 이름과 날짜는 선택 항목이며, 적으면 미리보기와 PDF에 들어가요."
          >
            <label
              className={cx(styles.check, groupTone('copyProvided'))}
              data-field="copyProvided"
            >
              <input
                type="checkbox"
                checked={draft.copyProvided}
                onChange={(e) => set('copyProvided', e.target.checked)}
              />
              계약 체결 시 근로자에게 계약서 사본을 교부해요
            </label>
            {note('copyProvided')}
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
                <input
                  value={draft.workerName}
                  onChange={(e) => set('workerName', e.target.value)}
                />
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
          </Row>
        </div>

        <section id="row-confirm" className={styles.confirm}>
          <h3>서명 전에 직접 확인할 것</h3>
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

        {/* 휴대폰·태블릿에서는 결과 요약이 서식 맨 아래에 있어, 입력하는 동안 개수를 붙여 둔다. */}
        <a className={styles.mobileSummary} href="#contract-summary">
          <span>
            경고 <b className={styles.danger}>{summary.danger}</b> · 확인{' '}
            <b className={styles.warning}>{summary.warning}</b>
          </span>
          <span>점검 결과 보기 ↓</span>
        </a>
      </form>

      <aside id="contract-summary" className={styles.summary} aria-label="점검 결과 요약">
        <div className={styles.summaryHead}>
          <strong>점검 결과</strong>
          <small>입력할 때마다 바로 바뀌어요</small>
        </div>
        <dl className={styles.counts}>
          <div className={styles.danger}>
            <dt>경고</dt>
            <dd>{summary.danger}</dd>
          </div>
          <div className={styles.warning}>
            <dt>확인</dt>
            <dd>{summary.warning}</dd>
          </div>
          <div className={styles.ok}>
            <dt>충족</dt>
            <dd>{summary.ok}</dd>
          </div>
        </dl>
        <ol className={styles.summaryList}>
          {findings
            .filter((f) => f.tone === 'danger' || f.tone === 'warning')
            .map((f) => (
              <li key={f.title}>
                <a href={`#row-${f.section}`}>
                  <small>
                    <span className={styles[f.tone]}>{TONE_LABEL[f.tone]}</span> ·{' '}
                    {SECTION_TITLES[f.section]}
                  </small>
                  <span>{f.title}</span>
                </a>
              </li>
            ))}
          {summary.danger + summary.warning === 0 && (
            <li>경고·확인 항목이 없어요. 아래 미리보기로 내용을 확인하세요.</li>
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
