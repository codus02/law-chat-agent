import { useId } from 'react';
import { cx } from '@/lib/cx';
import styles from './contract.module.css';

export type SectionState = 'empty' | 'complete' | 'warning';

const DEFAULT_STATE_LABELS: Record<SectionState, string> = {
  empty: '입력 전',
  complete: '확인 완료',
  warning: '확인 필요',
};

type FormCardProps = {
  number: string;
  title: string;
  description: string;
  state: SectionState;
  stateLabel?: string;
  className?: string;
  children: React.ReactNode;
};

export function FormCard({
  number,
  title,
  description,
  state,
  stateLabel,
  className,
  children,
}: FormCardProps) {
  const titleId = useId();

  return (
    <section
      className={cx(
        styles.formCard,
        state === 'complete' && styles.isComplete,
        state === 'warning' && styles.hasWarning,
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className={styles.formCardHead}>
        <span className={styles.sectionNumber}>{number}</span>
        <div>
          <h3 id={titleId}>{title}</h3>
          <p>{description}</p>
        </div>
        <span className={styles.sectionState}>{stateLabel ?? DEFAULT_STATE_LABELS[state]}</span>
      </div>
      {children}
    </section>
  );
}
