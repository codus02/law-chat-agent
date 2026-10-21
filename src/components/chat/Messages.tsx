import { Icon } from '@/components/common/Icon';
import { CATEGORIES, type Category } from '@/lib/categories';
import type { Answer } from '@/lib/chat';
import { cx } from '@/lib/cx';
import { ISSUES, type IssueId } from '@/lib/intake';
import { AnswerCard } from './AnswerCard';
import type { AnswerResult, JudgeAnswer, JudgeResult } from '@/lib/rag-client';
import { FactCheckCard } from './FactCheckCard';
import { FollowUpCard, JudgeAnswerCard, PendingStatus } from './JudgeCards';
import judgeStyles from './judge.module.css';
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

/**
 * 첫 화면: 상담 유형 선택.
 * 유형을 고르면 선택 상태로 남고, 첫 질문을 보낸 뒤(locked)에는 바꿀 수 없다. 새 상담에서 다시 고른다.
 */
export function IntroMessage({
  selected,
  locked,
  onSelect,
}: {
  selected: Category | null;
  locked: boolean;
  onSelect: (category: Category) => void;
}) {
  return (
    <AssistantMessage>
      <div className={styles.messageBubble}>
        <strong className={styles.introTitle}>안녕하세요, 로바로예요.</strong>
        <p className={styles.introText}>
          어떤 문제로 상담받고 싶으신가요? 유형을 고르면 상황을 자유롭게 적을 수 있어요.
        </p>
      </div>
      <div className={styles.categoryList} role="group" aria-label="상담 유형">
        {CATEGORIES.map((category) => {
          const isSelected = selected?.id === category.id;
          return (
            <button
              key={category.id}
              type="button"
              className={cx(styles.categoryButton, isSelected && styles.isSelected)}
              aria-pressed={isSelected}
              disabled={locked && !isSelected}
              onClick={() => onSelect(category)}
            >
              <span className={styles.categoryText}>
                <strong>{category.label}</strong>
                <small>{category.description}</small>
              </span>
              {isSelected && (
                <span className={styles.categoryCheck} aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </AssistantMessage>
  );
}

/** 유형을 고른 뒤 상황을 자유롭게 적도록 안내하고, 예시 문장을 눌러 바로 채울 수 있게 한다. */
export function CategoryPromptMessage({
  category,
  onSelect,
  onAppend,
}: {
  category: Category;
  onSelect: (text: string) => void;
  /** 작성 도우미: 항목 이름을 입력창에 덧붙인다 */
  onAppend: (label: string) => void;
}) {
  const isOther = category.id === 'other';
  return (
    <AssistantMessage>
      <div className={styles.messageBubble}>
        <strong className={styles.introTitle}>
          {isOther ? '어떤 유형인지 몰라도 괜찮아요.' : `${category.label} 상담이군요.`}
        </strong>
        <p className={styles.introText}>
          지금 겪는 상황을 자유롭게 적어 주세요. 법 용어를 몰라도 괜찮아요. 판단에 꼭 필요한 정보가
          빠졌을 때만 한 번 여쭤보고, 그다음엔 반드시 침해인지 아닌지 알려 드릴게요.
        </p>
      </div>
      {category.checklist.length > 0 && (
        <div className={judgeStyles.checklist}>
          <small>
            아래 내용을 함께 적으면 추가 질문 없이 바로 답할 수 있어요. 누르면 입력창에 들어가요.
          </small>
          <div className={styles.suggestionChips}>
            {category.checklist.map((item) => (
              <button key={item} type="button" onClick={() => onAppend(item)}>
                + {item}
              </button>
            ))}
          </div>
        </div>
      )}
      {category.examples.length > 0 && (
        <div className={judgeStyles.checklist}>
          <small>예시 문장으로 시작해도 돼요.</small>
          <div className={styles.suggestionChips}>
            {category.examples.map((example) => (
              <button key={example} type="button" onClick={() => onSelect(example)}>
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </AssistantMessage>
  );
}

/** 질문만으로 점검할 쟁점이 하나로 정해지지 않을 때. 고른 뒤에는 선택만 남기고 잠근다. */
export function IssuePickMessage({
  issues,
  chosen,
  onPick,
  onSkip,
}: {
  issues: IssueId[];
  chosen?: IssueId;
  onPick: (issue: IssueId) => void;
  onSkip: () => void;
}) {
  return (
    <AssistantMessage>
      <div className={styles.messageBubble}>
        <strong className={styles.introTitle}>어떤 점을 확인해 드릴까요?</strong>
        <p className={styles.introText}>
          적어 주신 상황에서 바로 점검할 수 있는 쟁점이에요. 하나를 고르면 판정에 필요한 것만 짧게
          확인할게요.
        </p>
      </div>
      <div className={styles.categoryList} role="group" aria-label="점검할 쟁점">
        {issues.map((id) => {
          const issue = ISSUES[id];
          const isChosen = chosen === id;
          return (
            <button
              key={id}
              type="button"
              className={cx(styles.categoryButton, isChosen && styles.isSelected)}
              aria-pressed={isChosen}
              disabled={!!chosen && !isChosen}
              onClick={() => onPick(id)}
            >
              <span className={styles.categoryText}>
                <strong>{issue.label}</strong>
                <small>{issue.description}</small>
              </span>
              {isChosen && (
                <span className={styles.categoryCheck} aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {!chosen && (
        <div className={styles.suggestionChips}>
          <button type="button" onClick={onSkip}>
            해당하는 게 없어요. 관련 법령을 찾아 주세요
          </button>
        </div>
      )}
    </AssistantMessage>
  );
}

export function FactCheckMessage({
  question,
  issue,
  onEvidence,
}: {
  question: string;
  issue: IssueId;
  onEvidence: (question: string) => void;
}) {
  return (
    <AssistantMessage>
      <FactCheckCard question={question} issue={issue} onEvidence={onEvidence} />
    </AssistantMessage>
  );
}

export function FollowUpMessage({
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
  return (
    <AssistantMessage>
      <FollowUpCard
        questions={questions}
        submitted={submitted}
        disabled={disabled}
        onSubmit={onSubmit}
      />
    </AssistantMessage>
  );
}

export function JudgeAnswerMessage({ result }: { result: JudgeResult }) {
  return (
    <AssistantMessage>
      <JudgeAnswerCard result={result} />
      <p className={styles.answerDisclaimer}>
        법률 정보 제공을 위한 답변이며, 구체적 분쟁은 전문가 상담이 필요할 수 있어요.
      </p>
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
      <PendingStatus />
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
