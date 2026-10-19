'use client';

import { useState } from 'react';
import { cx } from '@/lib/cx';
import type { JudgeAnswer, JudgeResult } from '@/lib/rag-client';
import answerStyles from './answer.module.css';
import styles from './judge.module.css';

const CHOICES = ['예', '아니요', '모름'] as const;

/**
 * 판정 전에 한 번만 묻는 추가 질문. 결론을 바꿀 수 있는 사실만 최대 3개.
 * 답하지 않은 질문은 "모름"으로 보내며, 어느 경우든 다음 응답은 반드시 판정이다.
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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const send = (skip: boolean) => {
    const filled: JudgeAnswer[] = questions.map((question) => ({
      question,
      answer: skip ? '모름' : answers[question] || '모름',
    }));
    if (note.trim())
      filled.push({ question: '추가로 알려 드리는 사실', answer: note.trim().slice(0, 300) });
    onSubmit(filled.slice(0, 3 + (note.trim() ? 1 : 0)));
  };
  const locked = submitted || disabled;
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
                  className={cx(answers[question] === choice && styles.isChosen)}
                  aria-pressed={answers[question] === choice}
                  disabled={locked}
                  onClick={() => setAnswers((current) => ({ ...current, [question]: choice }))}
                >
                  {choice}
                </button>
              ))}
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
      {!submitted && (
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
      )}
      {submitted && <p className={styles.lead}>답변을 반영해 판정했어요.</p>}
    </div>
  );
}

export function JudgeAnswerCard({ result }: { result: JudgeResult }) {
  const violation = result.verdict === '침해';
  return (
    <div className={answerStyles.answerCard} data-judge-answer>
      <div className={cx(styles.verdict, violation ? styles.isViolation : styles.isLawful)}>
        <strong>{violation ? '권리 침해로 보여요' : '권리 침해로 보기 어려워요'}</strong>
        <small>
          판정: {result.verdict} ·{' '}
          {result.origin === 'rule' ? '확인한 사실로 규칙 점검' : 'AI 모델 판단'}
        </small>
      </div>
      {(result.assumptions ?? []).length > 0 && (
        <p className={styles.lead}>
          글에 없는 전제는 이렇게 보고 판단했어요: {result.assumptions!.join(', ')}. 다르면 결론이
          달라질 수 있어요.
        </p>
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
        <div className={styles.assumption}>
          <p>아래 내용은 모르는 상태로 판단했어요. 사실이 확인되면 결론이 달라질 수 있어요.</p>
          <ul>
            {result.assumed_unknowns!.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      )}
      {(result.sources ?? []).length > 0 && (
        <details className={answerStyles.sources}>
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
        {result.reference_date} 기준 · 로컬 모델({result.model}) 판단이며 법률 전문가의 검토를
        거치지 않았어요.
      </p>
    </div>
  );
}
