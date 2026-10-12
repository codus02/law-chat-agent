'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { useToast } from '@/components/common/Toast';
import { findCategory, type Category, type CategoryId } from '@/lib/categories';
import { MAX_MESSAGE_LENGTH, type ChatMessage } from '@/lib/chat';
import { cx } from '@/lib/cx';
import { formatNumber } from '@/lib/format';
import { CATEGORY_ISSUES, routeIssues, type IssueId } from '@/lib/intake';
import { LAW_COLLECTED_DATE } from '@/lib/site';
import { answerQuestion, RagApiError } from '@/lib/rag-client';
import {
  AnswerMessage,
  CategoryPromptMessage,
  ErrorMessage,
  FactCheckMessage,
  IntroMessage,
  IssuePickMessage,
  PendingMessage,
  RagAnswerMessage,
  UserMessage,
} from './Messages';
import styles from './chat.module.css';

const INTRO_MESSAGE: ChatMessage = { id: 'intro', role: 'assistant', kind: 'intro' };

/** 유형 선택 직후의 대화: 첫 화면 + 상황을 적도록 안내 */
const openingMessages = (category: Category): ChatMessage[] => [
  INTRO_MESSAGE,
  { id: 'category-prompt', role: 'assistant', kind: 'category-prompt', category },
];

type AskOptions = {
  categoryId: CategoryId;
  /** 실패한 답변을 같은 자리에서 다시 시도할 때 */
  retryId?: string;
  /** 사용자 말풍선을 새로 붙일지. 사실 확인 카드에서 이어지는 검색은 붙이지 않는다 */
  echoUser?: boolean;
  /** evidence: 생성 없이 관련 법령 원문만 검색 */
  mode?: 'context' | 'evidence';
};

/**
 * 상담 흐름
 * 1. 유형 선택 → 2. 상황 입력 → 3. 질문에서 점검할 쟁점을 정하고(애매하면 고르게 함)
 * 4. 사실 확인 카드가 부족한 값만 묻고 확인된 값으로 판정한다.
 * 쟁점이 없는 질문은 기존 검색·생성 답변(/api/rag/answer)으로 넘긴다.
 */
export function ChatRoom({
  initialQuestion,
  initialCategory,
}: {
  initialQuestion: string;
  initialCategory: CategoryId | null;
}) {
  const showToast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [category, setCategory] = useState<Category | null>(null);
  const [draft, setDraft] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextMessageId = useRef(1);
  const activeRequest = useRef<AbortController | null>(null);
  const previousCount = useRef(messages.length);

  const newId = () => `message-${nextMessageId.current++}`;

  // 검색·생성 답변. 규칙 점검으로 다룰 수 없는 질문과 "관련 법령 원문 찾아보기"에 쓴다.
  const ask = useCallback(async (question: string, options: AskOptions) => {
    const text = question.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text || activeRequest.current) return;
    const { categoryId, retryId, echoUser = true, mode = 'context' } = options;
    const controller = new AbortController();
    activeRequest.current = controller;
    const replyId = retryId || newId();
    const pending: ChatMessage = { id: replyId, role: 'assistant', kind: 'pending' };
    setMessages((prev) => {
      if (retryId) return prev.map((message) => (message.id === retryId ? pending : message));
      const user: ChatMessage[] = echoUser
        ? [{ id: newId(), role: 'user', text, category: categoryId }]
        : [];
      return [...prev, ...user, pending];
    });
    setIsBusy(true);
    try {
      const answer = await answerQuestion(text, {
        retrieval: 'hybrid',
        top_k: 3,
        mode,
        category: categoryId,
        signal: controller.signal,
      });
      if (activeRequest.current !== controller) return;
      setMessages((prev) =>
        prev.map((message) =>
          message.id === replyId
            ? { id: replyId, role: 'assistant', kind: 'rag-answer', answer }
            : message,
        ),
      );
    } catch (error) {
      if (controller.signal.aborted || activeRequest.current !== controller) return;
      const errorText =
        error instanceof RagApiError
          ? error.message
          : '연결이 끊겼어요. 서버가 실행 중인지 확인하고 다시 시도해 주세요.';
      setMessages((prev) =>
        prev.map((message) =>
          message.id === replyId
            ? {
                id: replyId,
                role: 'assistant',
                kind: 'error',
                text: errorText,
                question: text,
                category: categoryId,
              }
            : message,
        ),
      );
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setIsBusy(false);
      }
    }
  }, []);

  // 쟁점이 정해진 질문은 사실 확인 카드로 넘긴다. 카드가 스스로 점검 API를 부른다.
  const startFactCheck = useCallback((question: string, categoryId: CategoryId, issue: IssueId) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `message-${nextMessageId.current++}`,
        role: 'assistant',
        kind: 'fact-check',
        question,
        category: categoryId,
        issue,
      },
    ]);
  }, []);

  // 사용자가 적은 상황을 받아 쟁점을 정한다.
  const submitQuestion = useCallback(
    (question: string, current: Category) => {
      const text = question.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!text) return;
      setDraft('');
      const issues = routeIssues(current.id, text);
      const unmatched = issues.length === CATEGORY_ISSUES[current.id].length && issues.length > 1;
      if (current.id === 'other' && unmatched) {
        // 단서가 전혀 없는 '기타' 질문은 바로 검색·생성 답변으로
        void ask(text, { categoryId: current.id });
        return;
      }
      setMessages((prev) => [...prev, { id: newId(), role: 'user', text, category: current.id }]);
      if (issues.length === 1) {
        startFactCheck(text, current.id, issues[0]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          kind: 'issue-pick',
          question: text,
          category: current.id,
          issues,
        },
      ]);
    },
    [ask, startFactCheck],
  );

  const pickIssue = (messageId: string, issue: IssueId) => {
    const target = messages.find((message) => message.id === messageId);
    if (!target || target.role !== 'assistant' || target.kind !== 'issue-pick' || target.chosen) {
      return;
    }
    setMessages((prev) =>
      prev.map((message) => (message.id === messageId ? { ...target, chosen: issue } : message)),
    );
    startFactCheck(target.question, target.category, issue);
  };

  const skipIssue = (messageId: string) => {
    const target = messages.find((message) => message.id === messageId);
    if (!target || target.role !== 'assistant' || target.kind !== 'issue-pick') return;
    setMessages((prev) => prev.filter((message) => message.id !== messageId));
    void ask(target.question, { categoryId: target.category, echoUser: false });
  };

  useEffect(
    () => () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    },
    [],
  );

  // 홈에서 넘어온 질문. 유형(c)도 함께 왔으면 바로 시작하고, 없으면 유형을 고르도록 입력창에만 채운다.
  // 주소의 ?q=를 지워 새로고침해도 다시 보내지 않게 한다.
  useEffect(() => {
    if (!initialQuestion) return;
    const timer = setTimeout(() => {
      window.history.replaceState(null, '', '/chat');
      const initial = findCategory(initialCategory);
      if (initial) {
        setCategory(initial);
        setMessages(openingMessages(initial));
        submitQuestion(initialQuestion, initial);
      } else {
        setDraft(initialQuestion.slice(0, MAX_MESSAGE_LENGTH));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [initialQuestion, initialCategory, submitQuestion]);

  // 새 메시지가 추가되면 맨 아래로 스크롤한다.
  useEffect(() => {
    const list = messagesRef.current;
    if (list && messages.length >= previousCount.current) list.scrollTop = list.scrollHeight;
    previousCount.current = messages.length;
  }, [messages]);

  // 입력 내용에 맞춰 입력창 높이를 늘리고 줄인다.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }, [draft]);

  const fillDraft = (text: string) => {
    setDraft(text.slice(0, MAX_MESSAGE_LENGTH));
    inputRef.current?.focus();
  };

  const hasAsked = messages.some((message) => message.role === 'user');

  // 첫 화면에서 유형을 고른다. 첫 질문을 보내기 전까지는 다른 유형으로 바꿀 수 있다.
  const pickCategory = (next: Category) => {
    if (hasAsked) return;
    setCategory(next);
    setMessages(openingMessages(next));
    inputRef.current?.focus();
  };

  const send = () => {
    if (category) submitQuestion(draft, category);
  };

  const startNewChat = () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setIsBusy(false);
    setMessages([INTRO_MESSAGE]);
    setCategory(null);
    setDraft('');
    showToast('새 상담을 시작했어요.');
  };

  return (
    <div className={styles.chatPage} data-immersive>
      <aside className={styles.chatHistory} aria-label="상담 기록">
        <button className={styles.newChat} type="button" onClick={startNewChat}>
          <Icon name="plus" size={18} /> 새 상담 시작
        </button>
        <p className={styles.historyLabel}>이번 상담의 질문</p>
        {category && (
          <p className={styles.historyCategory}>
            <small>상담 유형</small>
            <strong>{category.label}</strong>
          </p>
        )}
        {messages
          .filter((message) => message.role === 'user')
          .map((item) => (
            <button
              key={item.id}
              className={styles.historyItem}
              type="button"
              onClick={() => fillDraft(item.text)}
            >
              <strong>{item.text}</strong>
              <small>입력창에 다시 가져오기</small>
            </button>
          ))}
      </aside>

      <div className={styles.chatMain}>
        <header className={styles.chatHeader}>
          <Link
            className={cx(styles.iconButton, styles.headerBack)}
            href="/"
            aria-label="서비스 홈으로"
          >
            <Icon name="arrowLeft" size={22} />
          </Link>
          <span className={styles.assistantAvatar} aria-hidden="true">
            로
          </span>
          <div className={styles.chatTitle}>
            <h1>노동법 상담</h1>
            <small>
              <i aria-hidden="true" />
              {LAW_COLLECTED_DATE} 수집 법령 기준
            </small>
          </div>
          <button
            className={cx(styles.iconButton, styles.headerNewChat)}
            type="button"
            aria-label="새 상담 시작"
            onClick={startNewChat}
          >
            <Icon name="plus" size={22} />
          </button>
        </header>

        <div ref={messagesRef} className={styles.messages} aria-live="polite">
          {messages.map((message) => {
            if (message.role === 'user') {
              return <UserMessage key={message.id} text={message.text} />;
            }
            switch (message.kind) {
              case 'intro':
                return (
                  <IntroMessage
                    key={message.id}
                    selected={category}
                    locked={hasAsked}
                    onSelect={pickCategory}
                  />
                );
              case 'category-prompt':
                return (
                  <CategoryPromptMessage
                    key={message.id}
                    category={message.category}
                    onSelect={fillDraft}
                  />
                );
              case 'issue-pick':
                return (
                  <IssuePickMessage
                    key={message.id}
                    issues={message.issues}
                    chosen={message.chosen}
                    onPick={(issue) => pickIssue(message.id, issue)}
                    onSkip={() => skipIssue(message.id)}
                  />
                );
              case 'fact-check':
                return (
                  <FactCheckMessage
                    key={message.id}
                    question={message.question}
                    issue={message.issue}
                    onEvidence={(question) =>
                      void ask(question, {
                        categoryId: message.category,
                        echoUser: false,
                        mode: 'evidence',
                      })
                    }
                  />
                );
              case 'answer':
                return (
                  <AnswerMessage key={message.id} answer={message.answer} onSelect={fillDraft} />
                );
              case 'pending':
                return <PendingMessage key={message.id} />;
              case 'rag-answer':
                return (
                  <RagAnswerMessage key={message.id} answer={message.answer} onRefine={fillDraft} />
                );
              case 'error':
                return (
                  <ErrorMessage
                    key={message.id}
                    text={message.text}
                    disabled={isBusy}
                    onRetry={() =>
                      void ask(message.question, {
                        categoryId: message.category ?? 'other',
                        retryId: message.id,
                      })
                    }
                  />
                );
            }
          })}
        </div>

        <div className={styles.composerWrap}>
          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            {category && !hasAsked && <p className={styles.composerHint}>{category.hint}</p>}
            <textarea
              ref={inputRef}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              enterKeyHint="send"
              placeholder={category ? category.placeholder : '먼저 위에서 상담 유형을 골라 주세요'}
              aria-label="상담 내용"
              disabled={!category}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // 한글 조합 중 Enter는 글자 확정이므로 전송하지 않는다.
                if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
                  return;
                }
                event.preventDefault();
                send();
              }}
            />
            <div className={styles.composerBottom}>
              <Link className={styles.attachLink} href="/contract?tab=upload">
                <Icon name="upload" size={16} />
                계약서 점검
              </Link>
              <span className={styles.charCount}>
                {formatNumber(draft.length)} / {formatNumber(MAX_MESSAGE_LENGTH)}
              </span>
              <button
                className={styles.sendButton}
                type="submit"
                aria-label="메시지 보내기"
                disabled={!category || !draft.trim() || isBusy}
              >
                <Icon name="arrowUp" size={20} />
              </button>
            </div>
          </form>
          <p className={styles.composerNotice}>
            답변은 참고용 법률 정보예요. 중요한 결정 전에는 전문가와 확인하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
