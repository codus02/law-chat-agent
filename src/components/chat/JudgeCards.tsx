'use client';

import { useEffect, useState } from 'react';
import { cx } from '@/lib/cx';
import type { JudgeAnswer, JudgeResult } from '@/lib/rag-client';
import answerStyles from './answer.module.css';
import styles from './judge.module.css';

const CHOICES = ['예', '아니요', '모름'] as const;

const formatSeconds = (seconds: number) =>
  seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;

const formatElapsed = (ms: number) =>
  ms < 1000 ? `${(ms / 1000).toFixed(1)}초` : formatSeconds(Math.round(ms / 1000));

/**
 * 답변을 기다리는 동안 지난 시간을 보여 준다. 규칙 점검은 몇 초 안에 끝나고,
 * AI 판정 모델은 노트북 CPU에서 돌기 때문에 몇 분 걸릴 수 있다.
 */
export function PendingStatus() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className={styles.pending} role="status">
      <div className={styles.pendingHead}>
        <span className={styles.pendingDots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <strong>
          {seconds < 8
            ? '규칙으로 바로 판정할 수 있는지 확인하고 있어요'
            : 'AI 판정 모델이 관련 법령을 읽고 있어요'}
        </strong>
        <small aria-label={`${formatSeconds(seconds)} 지남`}>{formatSeconds(seconds)}</small>
      </div>
      <p className={styles.lead}>
        {seconds < 8
          ? '확인한 사실만으로 판정할 수 있으면 몇 초 안에 답해요.'
          : '노트북에서 돌아가는 로컬 모델이라 보통 2~4분 걸려요. 이 창을 닫지 말고 기다려 주세요.'}
      </p>
    </div>
  );
}

/**
 * 판정 전에 한 번만 묻는 추가 질문. 결론을 바꿀 수 있는 사실만 최대 3개.
 * 예/아니요로 답하기 어려운 질문도 있어 질문마다 직접 적을 수 있다. 답하지 않은 질문은
 * "모름"으로 보내며, 어느 경우든 다음 응답은 반드시 판정이다.
 */
export function FollowUpCard({
  questions,
  submitted,
  disabled,
  onSubmit,
}: {
  questions: string[];
  submitted: boolean;
  disabled: boolean;
  onSubmit: (answers: JudgeAnswer[]) => void;
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [sent, setSent] = useState<JudgeAnswer[]>([]);
  const answerOf = (question: string) =>
    texts[question]?.trim().slice(0, 200) || choices[question] || '모름';
  const send = (skip: boolean) => {
    const filled: JudgeAnswer[] = questions
      .slice(0, 3)
      .map((question) => ({ question, answer: skip ? '모름' : answerOf(question) }));
    if (note.trim())
      filled.push({ question: '추가로 알려 드리는 사실', answer: note.trim().slice(0, 300) });
    setSent(filled);
    onSubmit(filled);
  };
  const locked = submitted || disabled;

  if (submitted) {
    return (
      <div className={styles.card} data-follow-up>
        <strong className={styles.title}>추가 질문에 답했어요</strong>
        <ul className={styles.sentList}>
          {(sent.length ? sent : questions.map((question) => ({ question, answer: '모름' }))).map(
            (item) => (
              <li key={item.question}>
                <span>{item.question}</span>
                <strong>{item.answer}</strong>
              </li>
            ),
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className={styles.card} data-follow-up>
      <strong className={styles.title}>판정 전에 {questions.length}가지만 확인할게요</strong>
      <p className={styles.lead}>
        답에 따라 결론이 달라질 수 있는 내용이에요. 모르면 &quot;모름&quot;을 눌러도 판정은 해
        드려요.
      </p>
      <ol className={styles.questions}>
        {questions.map((question) => (
          <li key={question}>
            <p>{question}</p>
            <div className={styles.choices} role="group" aria-label={question}>
              {CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={cx(choices[question] === choice && styles.isChosen)}
                  aria-pressed={choices[question] === choice}
                  disabled={locked}
                  onClick={() => setChoices((current) => ({ ...current, [question]: choice }))}
                >
                  {choice}
                </button>
              ))}
              <input
                className={styles.inlineAnswer}
                type="text"
                maxLength={200}
                placeholder="직접 적기 (선택)"
                aria-label={`${question} 직접 답하기`}
                value={texts[question] ?? ''}
                disabled={locked}
                onChange={(event) =>
                  setTexts((current) => ({ ...current, [question]: event.target.value }))
                }
              />
            </div>
          </li>
        ))}
      </ol>
      <label className={styles.note}>
        <span>덧붙일 내용 (선택)</span>
        <input
          type="text"
          maxLength={300}
          placeholder="예: 직원은 사장님 포함 6명이에요"
          value={note}
          disabled={locked}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={disabled}
          onClick={() => send(false)}
        >
          이대로 판정 받기
        </button>
        <button
          type="button"
          className={styles.secondary}
          disabled={disabled}
          onClick={() => send(true)}
        >
          잘 모르겠어요. 바로 판정해 주세요
        </button>
      </div>
    </div>
  );
}

export function JudgeAnswerCard({ result }: { result: JudgeResult }) {
  const violation = result.verdict === '침해';
  const byRule = result.origin === 'rule';
  const assumptions = result.assumptions ?? [];
  return (
    <div className={answerStyles.answerCard} data-judge-answer>
      <div className={cx(styles.verdict, violation ? styles.isViolation : styles.isLawful)}>
        <strong>{violation ? '권리 침해로 보여요' : '권리 침해로 보기 어려워요'}</strong>
        <span className={styles.originBadge}>{byRule ? '규칙 점검' : 'AI 판정'}</span>
      </div>
      {(result.scope || assumptions.length > 0) && (
        <div className={styles.meta}>
          {result.scope && (
            <p>
              <b>판단 범위</b> {result.scope}
            </p>
          )}
          {assumptions.length > 0 && (
            <p>
              <b>글에 없어 이렇게 봤어요</b> {assumptions.join(', ')}. 다르면 결론이 달라질 수
              있어요.
            </p>
          )}
        </div>
      )}
      {(result.sections ?? []).map((section) => (
        <section
          className={answerStyles.answerSection}
          key={section.key}
          data-answer-section={section.key}
        >
          <h3 className={answerStyles.sectionTitle}>{section.title}</h3>
          <p className={answerStyles.ragText}>{section.text}</p>
        </section>
      ))}
      {(result.assumed_unknowns ?? []).length > 0 && (
        <div className={cx(styles.assumption, styles.inCard)}>
          <p>아래 내용은 모르는 상태로 판단했어요. 사실이 확인되면 결론이 달라질 수 있어요.</p>
          <ul>
            {result.assumed_unknowns!.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      )}
      {(result.sources ?? []).length > 0 && (
        <details className={cx(answerStyles.sources, styles.flushSources)}>
          <summary className={answerStyles.sourcesTitle}>
            참고한 법령·자료 {result.sources!.length}건
          </summary>
          {result.sources!.map((source, index) => (
            <div className={answerStyles.source} key={source.id}>
              <span className={answerStyles.sourceNumber}>{index + 1}</span>
              <div>
                <strong>{source.title}</strong>
                {/^https?:\/\//i.test(source.url) && (
                  <a
                    className={answerStyles.sourceLink}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    공식 출처 열기 ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </details>
      )}
      <p className={answerStyles.verificationNote}>
        {result.reference_date} 기준 ·{' '}
        {byRule
          ? '고정한 법령 원문으로 규칙이 계산한 결과예요.'
          : '노동 상담 사례로 미세조정한 AI 판정 모델의 판단이에요.'}{' '}
        법률 전문가의 검토를 거치지 않았어요. · 응답 {formatElapsed(result.elapsed_ms)}
      </p>
    </div>
  );
}
