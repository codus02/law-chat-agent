import {
  CHECK_BASIS,
  collectFindings,
  type ConditionForm,
  type ConditionStatus,
  type Finding,
} from '@/lib/contract-check';
import { cx } from '@/lib/cx';
import styles from './contract.module.css';

const FINDING_ICONS: Record<Finding['tone'], string> = {
  danger: '!',
  warning: '△',
  info: 'i',
};

type ConditionResultProps = {
  form: ConditionForm;
  status: ConditionStatus;
  ref?: React.Ref<HTMLDivElement>;
};

export function ConditionResult({ form, status, ref }: ConditionResultProps) {
  const { issues, notices } = collectFindings(form, status);
  const findings = [...issues, ...notices];

  return (
    <div ref={ref} className={styles.conditionResult} aria-live="polite">
      <div className={styles.resultHead}>
        <div>
          <h3>
            {issues.length
              ? `${issues.length}가지 확인이 필요해요`
              : '주요 근로조건을 모두 확인했어요'}
          </h3>
          <p>
            입력한 조건을 기준으로 한 안내이며 실제 계약 내용과 사업장 상황에 따라 달라질 수
            있습니다.
          </p>
        </div>
        <span className={styles.resultScore}>
          {status.completed} / {status.total} 확인
        </span>
      </div>

      <div className={styles.resultList}>
        {findings.length ? (
          findings.map((finding, index) => (
            <div
              key={`${index}-${finding.title}`}
              className={cx(
                styles.resultItem,
                finding.tone === 'danger' && styles.danger,
                finding.tone === 'warning' && styles.warning,
              )}
            >
              <span aria-hidden="true">{FINDING_ICONS[finding.tone]}</span>
              <div>
                <strong>{finding.title}</strong>
                <p>{finding.text}</p>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.resultItem}>
            <span aria-hidden="true">✓</span>
            <div>
              <strong>입력한 근로조건에서 빠진 항목을 찾지 못했어요</strong>
              <p>
                실제 계약서 내용과 입력값이 같은지 마지막으로 대조하고, 서명한 계약서 한 부를
                보관하세요.
              </p>
            </div>
          </div>
        )}
      </div>

      <p className={styles.resultBasis}>확인 기준 · {CHECK_BASIS}</p>
    </div>
  );
}
