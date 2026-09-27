'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Kicker } from '@/components/common/PageParts';
import { useToast } from '@/components/common/Toast';
import {
  createInitialForm,
  createWorkday,
  evaluateConditions,
  EXTRA_CHECKS,
  formatHours,
  MAX_WORKDAYS,
  MINIMUM_WAGE_2026,
  PAY_METHODS,
  type ConditionForm,
  type ExtraKey,
  type Workday,
} from '@/lib/contract-check';
import { cx } from '@/lib/cx';
import { formatNumber } from '@/lib/format';
import { ConditionResult } from './ConditionResult';
import { FormCard, type SectionState } from './FormCard';
import { WorkdayRow } from './WorkdayRow';
import styles from './contract.module.css';

function completeOr(isComplete: boolean): SectionState {
  return isComplete ? 'complete' : 'empty';
}

export function ConditionChecklist() {
  const showToast = useToast();
  const [form, setForm] = useState<ConditionForm>(createInitialForm);
  const [isResultVisible, setIsResultVisible] = useState(false);
  const nextWorkdayId = useRef(2);
  const resultRef = useRef<HTMLDivElement>(null);

  const status = evaluateConditions(form);
  const scheduleComplete = status.scheduleComplete && status.breakComplete;
  const scheduleTouched = form.workdays.some(
    (workday) => workday.day || workday.hours || workday.breakMinutes,
  );
  const scheduleState: SectionState = scheduleComplete
    ? 'complete'
    : scheduleTouched
      ? 'warning'
      : 'empty';
  const minimumWage = formatNumber(MINIMUM_WAGE_2026);

  const setField = <K extends keyof ConditionForm>(key: K, value: ConditionForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setExtra = (key: ExtraKey, checked: boolean) => {
    setForm((prev) => ({ ...prev, extras: { ...prev.extras, [key]: checked } }));
  };

  const updateWorkday = (id: number, patch: Partial<Omit<Workday, 'id'>>) => {
    setForm((prev) => ({
      ...prev,
      workdays: prev.workdays.map((workday) =>
        workday.id === id ? { ...workday, ...patch } : workday,
      ),
    }));
  };

  const addWorkday = () => {
    if (form.workdays.length >= MAX_WORKDAYS) {
      showToast(`근무일은 일주일 기준 최대 ${MAX_WORKDAYS}일까지 추가할 수 있어요.`);
      return;
    }
    const id = nextWorkdayId.current++;
    setForm((prev) => ({ ...prev, workdays: [...prev.workdays, createWorkday(id)] }));
  };

  const removeWorkday = (id: number) => {
    // 마지막 한 줄을 지우면 빈 줄을 다시 채워 둔다.
    const replacementId = nextWorkdayId.current++;
    setForm((prev) => {
      const rest = prev.workdays.filter((workday) => workday.id !== id);
      return { ...prev, workdays: rest.length ? rest : [createWorkday(replacementId)] };
    });
  };

  const showResult = () => {
    flushSync(() => setIsResultVisible(true));
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <>
      <div className={styles.conditionIntro}>
        <div>
          <Kicker>MY WORK CONDITIONS</Kicker>
          <h2>내가 합의한 근로조건을 적어보세요</h2>
          <p>
            막연히 체크하지 않고, 계약서에 적힌 내용을 직접 입력해 빠진 조건과 주의할 점을
            확인합니다.
          </p>
        </div>
        <div className={styles.completionBox}>
          <span>
            {status.completed} / {status.total} 확인
          </span>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="작성 진행률"
            aria-valuemin={0}
            aria-valuemax={status.total}
            aria-valuenow={status.completed}
          >
            <span style={{ width: `${(status.completed / status.total) * 100}%` }} />
          </div>
        </div>
      </div>

      <form
        className={styles.conditionForm}
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <FormCard
          number="01"
          title="임금"
          description="얼마를, 언제, 어떤 방식으로 받는지 확인하세요."
          state={status.wageComplete ? 'complete' : status.belowMinimumWage ? 'warning' : 'empty'}
          stateLabel={status.belowMinimumWage ? '최저임금 미달' : undefined}
        >
          <div className={cx(styles.fieldGrid, styles.wageGrid)}>
            <label className={styles.field}>
              <span>
                시급 <em>필수</em>
              </span>
              <div className={styles.inputAffix}>
                <input
                  type="number"
                  min={0}
                  step={10}
                  inputMode="numeric"
                  placeholder="예: 12000"
                  value={form.hourlyWage}
                  onChange={(event) => setField('hourlyWage', event.target.value)}
                />
                <b>원</b>
              </div>
              <small className={cx(styles.wageGuide, status.belowMinimumWage && styles.isDanger)}>
                {status.belowMinimumWage
                  ? `최저임금보다 ${formatNumber(MINIMUM_WAGE_2026 - status.hourlyWage)}원 적어요. 2026년 기준은 ${minimumWage}원입니다.`
                  : `2026년 최저임금은 시간당 ${minimumWage}원입니다.`}
              </small>
            </label>
            <label className={styles.field}>
              <span>
                임금 지급일 <em>필수</em>
              </span>
              <div className={styles.inputAffix}>
                <b>매월</b>
                <input
                  type="number"
                  min={1}
                  max={31}
                  inputMode="numeric"
                  placeholder="예: 10"
                  value={form.payDay}
                  onChange={(event) => setField('payDay', event.target.value)}
                />
                <b>일</b>
              </div>
              <small>말일이면 31을 입력하세요.</small>
            </label>
            <label className={styles.field}>
              <span>
                지급 방법 <em>필수</em>
              </span>
              <select
                value={form.payMethod}
                onChange={(event) => setField('payMethod', event.target.value)}
              >
                <option value="">선택하세요</option>
                {PAY_METHODS.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>수당·상여금</span>
              <input
                type="text"
                placeholder="예: 식대 10만 원, 상여금 없음"
                value={form.allowances}
                onChange={(event) => setField('allowances', event.target.value)}
              />
            </label>
          </div>
          <label className={styles.confirmLine}>
            <input
              type="checkbox"
              checked={form.wageWritten}
              onChange={(event) => setField('wageWritten', event.target.checked)}
            />
            <span>위 임금의 구성항목·계산방법·지급방법이 계약서에 구체적으로 적혀 있습니다.</span>
          </label>
        </FormCard>

        <FormCard
          number="02"
          title="요일별 근무시간과 휴게시간"
          description="근무일마다 시간이 다르면 한 줄씩 추가하세요. 휴게 기준은 각 근무일별로 판단합니다."
          state={scheduleState}
          stateLabel={scheduleState === 'warning' ? '시간·휴게 확인' : undefined}
        >
          <div className={styles.scheduleSummary} aria-live="polite">
            <div>
              <small>주 근무일</small>
              <strong>{status.workingDays}일</strong>
            </div>
            <div>
              <small>주 근로시간</small>
              <strong>{formatHours(status.weeklyHours)}시간</strong>
            </div>
          </div>
          <div className={styles.workdayList}>
            {form.workdays.map((workday, index) => (
              <WorkdayRow
                key={workday.id}
                workday={workday}
                index={index}
                onChange={(patch) => updateWorkday(workday.id, patch)}
                onRemove={() => removeWorkday(workday.id)}
              />
            ))}
          </div>
          <button className={styles.addWorkday} type="button" onClick={addWorkday}>
            <span aria-hidden="true">＋</span> 근무일 추가
          </button>
          <div className={styles.breakRule}>
            <strong>휴게시간 기준</strong>
            <span>4시간 이상 근로 시 30분 이상 · 8시간 이상 근로 시 1시간 이상</span>
            <small>
              휴게는 근로시간 도중에 주어지고 근로자가 자유롭게 이용할 수 있어야 합니다.
            </small>
          </div>
        </FormCard>

        <FormCard
          number="03"
          title="근무 장소와 담당 업무"
          description="실제로 일할 장소와 맡을 업무를 구체적으로 적으세요."
          state={completeOr(status.placeComplete)}
        >
          <div className={cx(styles.fieldGrid, styles.twoColumns)}>
            <label className={styles.field}>
              <span>
                근무 장소 <em>필수</em>
              </span>
              <input
                type="text"
                placeholder="예: 서울 마포구 ○○카페 2층"
                value={form.workplace}
                onChange={(event) => setField('workplace', event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>
                담당 업무 <em>필수</em>
              </span>
              <input
                type="text"
                placeholder="예: 음료 제조, 계산, 마감 청소"
                value={form.jobDuties}
                onChange={(event) => setField('jobDuties', event.target.value)}
              />
            </label>
          </div>
        </FormCard>

        <FormCard
          number="04"
          title="계약 기간"
          description="일을 시작하는 날과 계약 종료 여부를 확인하세요."
          state={completeOr(status.periodComplete)}
        >
          <div className={cx(styles.fieldGrid, styles.periodGrid)}>
            <label className={styles.field}>
              <span>
                근무 시작일 <em>필수</em>
              </span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setField('startDate', event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>근무 종료일</span>
              <input
                type="date"
                value={form.endDate}
                disabled={form.indefinite}
                onChange={(event) => setField('endDate', event.target.value)}
              />
            </label>
            <label className={styles.toggleField}>
              <input
                type="checkbox"
                checked={form.indefinite}
                onChange={(event) => {
                  const { checked } = event.target;
                  setForm((prev) => ({
                    ...prev,
                    indefinite: checked,
                    endDate: checked ? '' : prev.endDate,
                  }));
                }}
              />
              <span>
                <b>기간의 정함 없음</b>
                <small>종료일이 정해지지 않은 계약</small>
              </span>
            </label>
          </div>
        </FormCard>

        <FormCard
          number="05"
          title="추가로 꼭 확인할 조건"
          description="나중에 다툼이 생기기 쉬운 내용을 계약 전에 하나씩 확인하세요."
          state={completeOr(status.extraComplete)}
        >
          <div className={styles.confirmGrid}>
            {EXTRA_CHECKS.map((check) => (
              <label key={check.key} className={styles.confirmTile}>
                <input
                  type="checkbox"
                  checked={form.extras[check.key]}
                  onChange={(event) => setExtra(check.key, event.target.checked)}
                />
                <span className={styles.tileCheck} aria-hidden="true">
                  ✓
                </span>
                <span>
                  <b>{check.title}</b>
                  <small>{check.description}</small>
                </span>
              </label>
            ))}
          </div>
        </FormCard>

        <FormCard
          number="06"
          title="서면 계약서 교부"
          description="작성한 계약서는 회사만 보관하는 문서가 아닙니다."
          state={completeOr(status.copyComplete)}
          className={styles.handoffCard}
        >
          <label className={cx(styles.confirmLine, styles.emphasized)}>
            <input
              type="checkbox"
              checked={form.contractCopy}
              onChange={(event) => setField('contractCopy', event.target.checked)}
            />
            <span>
              <strong>서명한 근로계약서 한 부를 직접 받았습니다.</strong>
              <small>종이나 전자문서 형태로 보관해 두세요.</small>
            </span>
          </label>
        </FormCard>
      </form>

      <div className={styles.checkResult}>
        <div>
          <small>빠진 조건과 휴게시간을 한 번에</small>
          <strong>
            {status.completed} / {status.total} 항목 확인
          </strong>
        </div>
        <button type="button" onClick={showResult}>
          점검 결과 보기
        </button>
      </div>

      {isResultVisible && <ConditionResult ref={resultRef} form={form} status={status} />}
    </>
  );
}
