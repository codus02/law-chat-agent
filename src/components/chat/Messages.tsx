import type { Answer } from '@/lib/chat';
import { cx } from '@/lib/cx';
import { SITUATIONS, type Situation } from '@/lib/situations';
import { AnswerCard } from './AnswerCard';
import type { AnswerResult } from '@/lib/rag-client';
import { RagAnswerCard } from './RagAnswerCard';
import styles from './chat.module.css';

function AssistantMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.message}>
      <span className={styles.messageAvatar} aria-hidden="true">
        로
      </span>
      <div className={styles.messageBody}>{children}</div>
    </div>
  );
}

export function UserMessage({ text }: { text: string }) {
  return (
    <div className={cx(styles.message, styles.userMessage)}>
      <div className={styles.messageBubble}>
        <p>{text}</p>
      </div>
    </div>
  );
}

export function IntroMessage({ onSelect }: { onSelect: (situation: Situation) => void }) {
  return (
    <AssistantMessage>
      <div className={styles.messageBubble}>
        <strong className={styles.introTitle}>안녕하세요, 로바로예요.</strong>
        <p className={styles.introText}>
          일하면서 생긴 일, 편하게 말해 주세요. 법 용어를 몰라도 괜찮아요. 판단에 꼭 필요한 정보가
          빠졌을 때만 제가 먼저 여쭤볼게요.
        </p>
      </div>
      <div className={styles.suggestionChips}>
        {SITUATIONS.map((situation) => (
          <button key={situation.id} type="button" onClick={() => onSelect(situation)}>
            {situation.label}
          </button>
        ))}
      </div>
    </AssistantMessage>
  );
}

export function AnswerMessage({
  answer,
  onSelect,
}: {
  answer: Answer;
  onSelect: (text: string) => void;
}) {
  return (
    <AssistantMessage>
      <AnswerCard answer={answer} onSelect={onSelect} />
      <p className={styles.answerDisclaimer}>
        법률 정보 제공을 위한 답변이며, 구체적 분쟁은 전문가 상담이 필요할 수 있어요.
      </p>
    </AssistantMessage>
  );
}

export function PendingMessage() {
  return (
    <AssistantMessage>
      <div className={styles.messageBubble} role="status">
        <strong className={styles.introTitle}>근거를 찾아 답변을 준비하고 있어요.</strong>
        <p className={styles.introText}>
          로컬 모델이 답변을 생성하고 있어요. 첫 질문은 모델을 불러오는 데 시간이 더 걸릴 수 있어요.
        </p>
      </div>
    </AssistantMessage>
  );
}

export function RagAnswerMessage({
  answer,
  onRefine,
}: {
  answer: AnswerResult;
  onRefine: (text: string) => void;
}) {
  return (
    <AssistantMessage>
      <RagAnswerCard answer={answer} onRefine={onRefine} />
    </AssistantMessage>
  );
}

export function ErrorMessage({
  text,
  onRetry,
  disabled,
}: {
  text: string;
  onRetry: () => void;
  disabled: boolean;
}) {
  return (
    <AssistantMessage>
      <div className={styles.messageBubble} role="alert">
        <strong className={styles.introTitle}>답변을 받지 못했어요.</strong>
        <p className={styles.introText}>{text}</p>
        <div className={styles.suggestionChips}>
          <button type="button" onClick={onRetry} disabled={disabled}>
            다시 시도
          </button>
        </div>
      </div>
    </AssistantMessage>
  );
}
