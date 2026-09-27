import { checkBreak, WEEKDAYS, type Workday } from '@/lib/contract-check';
import { cx } from '@/lib/cx';
import styles from './contract.module.css';

type WorkdayRowProps = {
  workday: Workday;
  index: number;
  onChange: (patch: Partial<Omit<Workday, 'id'>>) => void;
  onRemove: () => void;
};

export function WorkdayRow({ workday, index, onChange, onRemove }: WorkdayRowProps) {
  const breakCheck = checkBreak(workday);
  const needsAttention = breakCheck.tone === 'warning' || breakCheck.tone === 'danger';

  return (
    <article className={cx(styles.workdayRow, needsAttention && styles.isWarning)}>
      <div className={styles.workdayIndex}>근무일 {index + 1}</div>

      <label className={cx(styles.workdayField, styles.dayField)}>
        <span>요일</span>
        <select value={workday.day} onChange={(event) => onChange({ day: event.target.value })}>
          <option value="">선택</option>
          {WEEKDAYS.map((day) => (
            <option key={day}>{day}</option>
          ))}
        </select>
      </label>

      <label className={cx(styles.workdayField, styles.hoursField)}>
        <span>근로시간</span>
        <div className={styles.breakInputWrap}>
          <input
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            inputMode="decimal"
            placeholder="예: 4"
            value={workday.hours}
            onChange={(event) => onChange({ hours: event.target.value })}
          />
          <span>시간</span>
        </div>
      </label>

      <div className={cx(styles.workdayField, styles.breakField)}>
        <span>휴게시간</span>
        <div className={styles.breakInputWrap}>
          <input
            type="number"
            min={0}
            max={1440}
            step={10}
            inputMode="numeric"
            placeholder="예: 30"
            aria-label="휴게시간(분)"
            value={workday.breakMinutes}
            onChange={(event) => onChange({ breakMinutes: event.target.value })}
          />
          <span>분</span>
        </div>
        <label className={styles.freeBreak}>
          <input
            type="checkbox"
            checked={workday.freeBreak}
            onChange={(event) => onChange({ freeBreak: event.target.checked })}
          />
          근로 도중 자유롭게 이용
        </label>
      </div>

      <div
        className={cx(
          styles.breakStatus,
          breakCheck.tone === 'warning' && styles.warning,
          breakCheck.tone === 'danger' && styles.danger,
        )}
      >
        <strong>{breakCheck.title}</strong>
        <small>{breakCheck.detail}</small>
      </div>

      <button
        className={styles.removeWorkday}
        type="button"
        aria-label={`근무일 ${index + 1} 삭제`}
        onClick={onRemove}
      >
        ×
      </button>
    </article>
  );
}
