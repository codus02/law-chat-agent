'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { cx } from '@/lib/cx';
import {
  BOOLEAN_LABELS,
  CHOICE_OPTIONS,
  FIELD_HELP,
  ISSUES,
  PREMISE_KEYS,
  type IssueId,
} from '@/lib/intake';
import {
  RagApiError,
  requestIntake,
  type FactValue,
  type Facts,
  type IntakeField,
  type IntakeResult,
} from '@/lib/rag-client';
import styles from './fact-check.module.css';

/**
 * 사실 확인 점검 카드.
 * 1) 질문에서 추정한 값은 [맞아요]/[수정하기]로만 확인받고, 비어 있는 값만 직접 묻는다.
 * 2) 값이 바뀌면 백엔드에서 필요한 항목을 다시 받아 조건부 항목(예: 휴게가 있을 때만 자유 이용 여부)을 맞춘다.
 * 3) 모든 값이 확인되면 confirmed=true로 판정을 받는다. 판정·근거·대응은 백엔드 규칙이 만든다.
 */
export function FactCheckCard({
  question,
  issue,
  onEvidence,
}: {
  question: string;
  issue: IssueId;
  /** 규칙 범위를 벗어났을 때 관련 법령 원문 검색으로 넘긴다 */
  onEvidence: (question: string) => void;
}) {
  const [intake, setIntake] = useState<IntakeResult | null>(null);
  const [values, setValues] = useState<Facts>({});
  // 질문에서 추정한 값 중 사용자가 아직 확인하지 않은 항목
  const [unconfirmed, setUnconfirmed] = useState<string[]>([]);
  const [editing, setEditing] = useState<string[]>([]);
  const [phase, setPhase] = useState<'loading' | 'editing' | 'checking' | 'done'>('loading');
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const request = useRef<AbortController | null>(null);
  const initialised = useRef(false);

  const issueMeta = ISSUES[issue];

  const fail = (caught: unknown) => {
    setError(
      caught instanceof RagApiError
        ? caught.message
        : '상담 서버와 연결이 끊겼어요. 서버가 실행 중인지 확인하고 다시 시도해 주세요.',
    );
  };

  // 첫 요청: 확인 항목과 질문에서 추정한 값을 받는다.
  const load = async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPhase('loading');
    setError(null);
    try {
      const data = await requestIntake(
        { question, issue, facts: {}, confirmed: false },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const suggested = Object.keys(data.facts).filter(
        (key) => data.facts[key] !== null && !['as_of_date', 'korea'].includes(key),
      );
      setIntake(data);
      // 기준일은 검토된 자료의 기준일로 고정하고, 근무지는 대한민국을 기본값으로 둔다.
      setValues({ ...data.facts, as_of_date: data.as_of_date, korea: data.facts.korea ?? true });
      setUnconfirmed(suggested);
      setEditing([]);
      setMissing([]);
      setResult(null);
      setPhase('editing');
    } catch (caught) {
      if (controller.signal.aborted) return;
      fail(caught);
      setPhase('editing');
    }
  };

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    void load();
    return () => request.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 값이 바뀌면 조건부 항목을 다시 받는다. 값 자체는 바꾸지 않는다.
  useEffect(() => {
    if (phase !== 'editing' || !intake) return;
    const timer = setTimeout(async () => {
      const controller = new AbortController();
      try {
        const data = await requestIntake(
          { question, issue, facts: values, confirmed: false },
          controller.signal,
        );
        setIntake((current) => (current ? { ...current, fields: data.fields } : data));
      } catch {
        // 항목 갱신 실패는 조용히 넘기고, 최종 점검에서 다시 확인한다.
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const fields = useMemo(() => intake?.fields ?? [], [intake]);
  const premiseFields = fields.filter(
    (field) =>
      (PREMISE_KEYS as readonly string[]).includes(field.key) &&
      !['as_of_date', 'korea'].includes(field.key),
  );
  const issueFields = fields.filter(
    (field) => !(PREMISE_KEYS as readonly string[]).includes(field.key),
  );

  const emptyKeys = useMemo(
    () =>
      fields
        .filter((field) => values[field.key] === null || values[field.key] === undefined)
        .map((f) => f.key),
    [fields, values],
  );
  const pendingConfirm = unconfirmed.filter((key) => fields.some((field) => field.key === key));
  const canSubmit =
    phase === 'editing' && !!intake && emptyKeys.length === 0 && pendingConfirm.length === 0;

  const setValue = (key: string, value: FactValue) => {
    setValues((current) => ({ ...current, [key]: value }));
    setUnconfirmed((current) => current.filter((item) => item !== key));
    setMissing((current) => current.filter((item) => item !== key));
    if (phase === 'done') {
      setPhase('editing');
      setResult(null);
    }
  };

  const confirmSuggested = (key: string) =>
    setUnconfirmed((current) => current.filter((item) => item !== key));
  const editSuggested = (key: string) => setEditing((current) => [...current, key]);

  const submit = async () => {
    if (!canSubmit) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPhase('checking');
    setError(null);
    try {
      const data = await requestIntake(
        { question, issue, facts: values, confirmed: true },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setResult(data);
      setIntake((current) => (current ? { ...current, fields: data.fields } : data));
      if (data.status === 'needs_more_info') {
        setMissing(data.missing_fields);
        setPhase('editing');
      } else {
        setPhase('done');
      }
    } catch (caught) {
      if (controller.signal.aborted) return;
      fail(caught);
      setPhase('editing');
    }
  };

  const reopen = () => {
    setPhase('editing');
    setResult(null);
  };

  return (
    <div className={styles.card} data-fact-check>
      <header className={styles.head}>
        <span className={styles.headIcon} aria-hidden="true">
          <Icon name="check" size={14} />
        </span>
        <div>
          <strong>{issueMeta.label} 확인할게요</strong>
          <small>{issueMeta.description}</small>
        </div>
      </header>

      {phase === 'loading' && (
        <p className={styles.loading} role="status">
          확인할 항목을 정리하고 있어요.
        </p>
      )}

      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => (intake ? void submit() : void load())}>
            다시 시도
          </button>
        </div>
      )}

      {intake && phase !== 'loading' && (
        <>
          <p className={styles.lead}>
            {pendingConfirm.length > 0 || emptyKeys.length > 0
              ? '판정에 꼭 필요한 것만 여쭤볼게요. 모르는 값은 비워 두면 추정하지 않고 알려드려요.'
              : '아래 내용이 맞다면 점검을 눌러 주세요.'}
          </p>

          <ul className={styles.fields}>
            {issueFields.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                value={values[field.key] ?? null}
                suggested={pendingConfirm.includes(field.key) && !editing.includes(field.key)}
                missing={missing.includes(field.key)}
                disabled={phase === 'checking'}
                onChange={(value) => setValue(field.key, value)}
                onConfirm={() => confirmSuggested(field.key)}
                onEdit={() => editSuggested(field.key)}
              />
            ))}
          </ul>

          <details
            className={styles.premise}
            open={premiseFields.some((f) => emptyKeys.includes(f.key) || missing.includes(f.key))}
          >
            <summary>
              <span>적용 범위 확인</span>
              <small>
                {intake.as_of_date} 기준 법령 ·{' '}
                {values.korea === false ? '대한민국 외 근무' : '대한민국 근무'}
                {premiseFields.every((f) => values[f.key] !== null && values[f.key] !== undefined)
                  ? ' · 확인 완료'
                  : ` · ${premiseFields.filter((f) => emptyKeys.includes(f.key)).length}개 남음`}
              </small>
            </summary>
            <p className={styles.premiseNote}>
              이 점검은 {intake.as_of_date}에 수집한 법령 기준이에요. 아래 조건에 맞지 않으면
              판정하지 않고 범위 밖이라고 알려드려요.
            </p>
            <ul className={styles.fields}>
              {premiseFields.map((field) => (
                <FieldRow
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? null}
                  suggested={pendingConfirm.includes(field.key) && !editing.includes(field.key)}
                  missing={missing.includes(field.key)}
                  disabled={phase === 'checking'}
                  onChange={(value) => setValue(field.key, value)}
                  onConfirm={() => confirmSuggested(field.key)}
                  onEdit={() => editSuggested(field.key)}
                />
              ))}
            </ul>
            <label className={styles.koreaToggle}>
              <input
                type="checkbox"
                checked={values.korea === false}
                disabled={phase === 'checking'}
                onChange={(event) => setValue('korea', !event.target.checked)}
              />
              대한민국 밖에서 일하고 있어요
            </label>
          </details>

          {phase !== 'done' && (
            <div className={styles.actions}>
              <button
                className={styles.primary}
                type="button"
                disabled={!canSubmit}
                onClick={() => void submit()}
              >
                {phase === 'checking' ? '점검하고 있어요' : '확인한 사실로 점검하기'}
              </button>
              {!canSubmit && phase === 'editing' && (
                <small className={styles.remaining}>
                  {pendingConfirm.length > 0 && `확인할 값 ${pendingConfirm.length}개`}
                  {pendingConfirm.length > 0 && emptyKeys.length > 0 && ' · '}
                  {emptyKeys.length > 0 && `비어 있는 값 ${emptyKeys.length}개`}
                </small>
              )}
            </div>
          )}

          {result && phase === 'done' && (
            <ResultBlock
              result={result}
              onReopen={reopen}
              onEvidence={() => onEvidence(question)}
            />
          )}
        </>
      )}
    </div>
  );
}

function formatValue(field: IntakeField, value: FactValue) {
  if (value === null || value === undefined) return '';
  if (field.type === 'boolean') return BOOLEAN_LABELS[value ? 'true' : 'false'];
  if (field.type === 'choice') {
    return (
      CHOICE_OPTIONS[field.key]?.find((option) => option.value === value)?.label ?? String(value)
    );
  }
  return String(value);
}

function FieldRow({
  field,
  value,
  suggested,
  missing,
  disabled,
  onChange,
  onConfirm,
  onEdit,
}: {
  field: IntakeField;
  value: FactValue;
  /** 질문에서 추정한 값이라 확인만 받는 상태 */
  suggested: boolean;
  missing: boolean;
  disabled: boolean;
  onChange: (value: FactValue) => void;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  const help = FIELD_HELP[field.key];
  const inputId = `fact-${field.key}`;
  return (
    <li className={cx(styles.field, missing && styles.isMissing, suggested && styles.isSuggested)}>
      <div className={styles.fieldText}>
        <label htmlFor={inputId}>{field.label}</label>
        {help && <small>{help}</small>}
        {missing && <small className={styles.missingNote}>판정에 이 값이 필요해요.</small>}
      </div>

      {suggested ? (
        <div className={styles.suggested}>
          <span className={styles.suggestedValue}>
            질문에서 읽은 값: <strong>{formatValue(field, value)}</strong>
          </span>
          <div className={styles.segment}>
            <button type="button" className={styles.isOn} disabled={disabled} onClick={onConfirm}>
              맞아요
            </button>
            <button type="button" disabled={disabled} onClick={onEdit}>
              수정하기
            </button>
          </div>
        </div>
      ) : field.type === 'boolean' ? (
        <div className={styles.segment} role="group" aria-labelledby={inputId}>
          <button
            type="button"
            className={cx(value === true && styles.isOn)}
            aria-pressed={value === true}
            disabled={disabled}
            onClick={() => onChange(true)}
          >
            예
          </button>
          <button
            type="button"
            className={cx(value === false && styles.isOn)}
            aria-pressed={value === false}
            disabled={disabled}
            onClick={() => onChange(false)}
          >
            아니요
          </button>
          <button
            type="button"
            className={cx(styles.unknown, value === null && styles.isOn)}
            aria-pressed={value === null}
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            모르겠어요
          </button>
        </div>
      ) : field.type === 'choice' ? (
        <div className={styles.segment} role="group" aria-labelledby={inputId}>
          {(CHOICE_OPTIONS[field.key] ?? []).map((option) => (
            <button
              key={option.value}
              type="button"
              className={cx(value === option.value && styles.isOn)}
              aria-pressed={value === option.value}
              disabled={disabled}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <input
          id={inputId}
          className={styles.input}
          type={field.type === 'date' ? 'date' : 'number'}
          inputMode={field.type === 'integer' ? 'numeric' : 'decimal'}
          step={field.type === 'number' ? 'any' : 1}
          min={field.type === 'date' ? undefined : 0}
          disabled={disabled}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') return onChange(null);
            if (field.type === 'date') return onChange(raw);
            const parsed = field.type === 'integer' ? parseInt(raw, 10) : parseFloat(raw);
            onChange(Number.isFinite(parsed) ? parsed : null);
          }}
        />
      )}
    </li>
  );
}

function ResultBlock({
  result,
  onReopen,
  onEvidence,
}: {
  result: IntakeResult;
  onReopen: () => void;
  onEvidence: () => void;
}) {
  const checked = result.status === 'checked' && result.verdict;
  const violated = result.verdict === '침해';
  const basis = result.sections.find((section) => section.key === 'basis');
  const action = result.sections.find((section) => section.key === 'action');
  return (
    <div className={styles.result} aria-live="polite">
      <div
        className={cx(
          styles.verdict,
          checked ? (violated ? styles.verdictBad : styles.verdictOk) : styles.verdictHold,
        )}
      >
        <small>① 적법·권리침해 여부</small>
        <strong>
          {checked
            ? violated
              ? '권리 침해에 해당해요'
              : '이 쟁점은 법 기준을 지켰어요'
            : '이 규칙만으로는 판정하지 않아요'}
        </strong>
        {checked && <span className={styles.verdictRaw}>판정: {result.verdict}</span>}
        {!checked && result.reason && <p>{result.reason}</p>}
      </div>

      {basis && (
        <section className={styles.section}>
          <h3>{basis.title}</h3>
          <p>{basis.text}</p>
          {result.sources.length > 0 && (
            <ul className={styles.sources}>
              {result.sources.map((source) => (
                <li key={source.id}>
                  {/^https?:\/\//i.test(source.url) ? (
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.title} 원문 보기 ↗
                    </a>
                  ) : (
                    source.title
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {action && (
        <section className={styles.section}>
          <h3>{action.title}</h3>
          <p>{action.text}</p>
        </section>
      )}

      {result.canonical_facts && (
        <details className={styles.facts}>
          <summary>점검에 쓴 사실</summary>
          <p>{result.canonical_facts}</p>
        </details>
      )}

      <div className={styles.resultActions}>
        <button type="button" onClick={onReopen}>
          값 고쳐서 다시 점검
        </button>
        <button type="button" onClick={onEvidence}>
          관련 법령 원문 찾아보기
        </button>
      </div>
      <p className={styles.notice}>{result.notice} 법률 전문가의 검토를 거치지 않은 점검이에요.</p>
    </div>
  );
}
