'use client';

import Form from 'next/form';
import { useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { MAX_MESSAGE_LENGTH } from '@/lib/chat';
import { cx } from '@/lib/cx';
import { DEFAULT_HINT, SITUATIONS, type Situation } from '@/lib/situations';
import styles from './home.module.css';

/**
 * 홈에서 바로 상담을 시작하는 입력창.
 * 제출하면 /chat?q=... 로 이동해 입력한 내용으로 상담을 시작한다.
 */
export function QuestionStarter() {
  const [text, setText] = useState('');
  const [selected, setSelected] = useState<Situation | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const pickSituation = (situation: Situation) => {
    setSelected(situation);
    // 칩은 첫 문장을 대신 써 주는 출발점이다. 사용자가 직접 쓴 내용은 덮어쓰지 않는다.
    setText((current) => {
      const untouched = !current.trim() || SITUATIONS.some((item) => item.starter === current);
      return untouched ? situation.starter : current;
    });
    inputRef.current?.focus();
  };

  return (
    <div className={styles.starter}>
      <Form action="/chat" className={styles.questionBox}>
        <label className={styles.visuallyHidden} htmlFor="home-question">
          지금 겪는 상황
        </label>
        <textarea
          id="home-question"
          ref={inputRef}
          name="q"
          rows={3}
          maxLength={MAX_MESSAGE_LENGTH}
          enterKeyHint="send"
          placeholder="예: 편의점에서 주 3일, 하루 6시간 일하는데 쉬는 시간이 없어요."
          aria-describedby="home-question-hint"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // 한글 조합 중 Enter는 글자 확정이므로 제출하지 않는다.
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            if (text.trim()) event.currentTarget.form?.requestSubmit();
          }}
        />
        <div className={styles.questionFooter}>
          <p id="home-question-hint" className={styles.hint}>
            {selected?.hint ?? DEFAULT_HINT}
          </p>
          <button className={styles.askButton} type="submit" disabled={!text.trim()}>
            상담 시작
            <Icon name="arrowRight" size={18} />
          </button>
        </div>
      </Form>
      <p className={styles.privacyNote}>이름·가게 이름 같은 개인정보는 적지 않아도 돼요.</p>

      <div className={styles.situations}>
        <p className={styles.situationsLabel} id="situation-label">
          어떻게 써야 할지 모르겠다면 눌러 보세요
        </p>
        <div className={styles.chips} role="group" aria-labelledby="situation-label">
          {SITUATIONS.map((situation) => (
            <button
              key={situation.id}
              type="button"
              className={cx(styles.chip, selected?.id === situation.id && styles.isSelected)}
              aria-pressed={selected?.id === situation.id}
              onClick={() => pickSituation(situation)}
            >
              {situation.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
