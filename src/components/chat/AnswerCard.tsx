import { Icon } from '@/components/common/Icon';
import type { Answer } from '@/lib/chat';
import { cx } from '@/lib/cx';
import styles from './answer.module.css';

function Citations({ ids }: { ids: number[] }) {
  return (
    <>
      {ids.map((id) => (
        <sup key={id} className={styles.citation} aria-label={`근거 ${id}`}>
          {id}
        </sup>
      ))}
    </>
  );
}

type AnswerCardProps = {
  answer: Answer;
  /** 홈 미리보기용: 다음 행동을 생략하고 근거는 첫 건만 보여준다. */
  compact?: boolean;
  /** 확인 질문의 선택지를 눌렀을 때. 없으면 선택지를 표시만 한다. */
  onSelect?: (text: string) => void;
};

export function AnswerCard({ answer, compact = false, onSelect }: AnswerCardProps) {
  const visibleSources = compact ? answer.sources.slice(0, 1) : answer.sources;
  const hiddenSourceCount = answer.sources.length - visibleSources.length;

  const sourceList = visibleSources.map((source) => (
    <div key={source.id} className={styles.source}>
      <span className={styles.sourceNumber}>{source.id}</span>
      <div>
        <strong>{source.title}</strong>
        <q>{source.quote}</q>
        <small>{source.origin}</small>
      </div>
    </div>
  ));

  return (
    <div className={cx(styles.answerCard, compact && styles.compact)}>
      <div className={styles.status}>
        <span className={styles.statusIcon} aria-hidden="true">
          <Icon name="check" size={13} />
        </span>
        <strong>근거와 함께 답변</strong>
        <small>근거 {answer.sources.length}건 · 예시</small>
      </div>

      <div className={styles.block}>
        <p className={styles.blockLabel}>결론</p>
        <p className={styles.conclusion}>
          <mark>{answer.conclusion}</mark>
          <Citations ids={answer.conclusionCitations} />
        </p>
      </div>

      <div className={styles.block}>
        <p className={styles.blockLabel}>적용 조건</p>
        <ul className={styles.conditions}>
          {answer.conditions.map((condition) => (
            <li
              key={condition.text}
              className={cx(condition.status === 'unknown' && styles.unknown)}
            >
              <span className={styles.conditionMark} aria-hidden="true">
                {condition.status === 'met' ? '✓' : '?'}
              </span>
              <div>
                <strong>
                  {condition.text}
                  <Citations ids={condition.citations} />
                </strong>
                {condition.detail && <small>{condition.detail}</small>}
              </div>
              <span className={styles.visuallyHidden}>
                {condition.status === 'met' ? '충족' : '확인 필요'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {answer.followUp && (
        <div className={styles.followUp}>
          <p className={styles.blockLabel}>확인이 더 필요해요</p>
          <p>{answer.followUp.question}</p>
          <div className={styles.options}>
            {answer.followUp.options.map((option) =>
              onSelect ? (
                <button key={option} type="button" onClick={() => onSelect(option)}>
                  {option}
                </button>
              ) : (
                <span key={option}>{option}</span>
              ),
            )}
          </div>
        </div>
      )}

      {!compact && answer.nextSteps.length > 0 && (
        <div className={styles.block}>
          <p className={styles.blockLabel}>다음에 할 수 있는 일</p>
          <ol className={styles.nextSteps}>
            {answer.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {compact ? (
        <div className={styles.sources}>
          <p className={styles.sourcesTitle}>근거 원문</p>
          {sourceList}
          {hiddenSourceCount > 0 && (
            <p className={styles.moreSources}>외 근거 {hiddenSourceCount}건</p>
          )}
        </div>
      ) : (
        <details className={styles.sources} open>
          <summary className={styles.sourcesTitle}>
            근거 원문 {answer.sources.length}건
            <Icon name="arrowUp" size={16} className={styles.chevron} />
          </summary>
          {sourceList}
        </details>
      )}
    </div>
  );
}
