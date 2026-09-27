'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { useToast } from '@/components/common/Toast';
import { MAX_MESSAGE_LENGTH, type ChatMessage } from '@/lib/chat';
import { cx } from '@/lib/cx';
import { formatNumber } from '@/lib/format';
import { LAW_COLLECTED_DATE } from '@/lib/site';
import type { Situation } from '@/lib/situations';
import { answerQuestion, RagApiError } from '@/lib/rag-client';
import {
  AnswerMessage,
  ErrorMessage,
  IntroMessage,
  PendingMessage,
  RagAnswerMessage,
  UserMessage,
} from './Messages';
import styles from './chat.module.css';

const INTRO_MESSAGE: ChatMessage = { id: 'intro', role: 'assistant', kind: 'intro' };

export function ChatRoom({ initialQuestion }: { initialQuestion: string }) {
  const showToast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([INTRO_MESSAGE]);
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextMessageId = useRef(1);
  const activeRequest = useRef<AbortController | null>(null);
  const previousCount = useRef(messages.length);

  const ask = useCallback(async (question: string, retryId?: string) => {
    const text = question.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text || activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const userId = `message-${nextMessageId.current++}`;
    const replyId = retryId || `message-${nextMessageId.current++}`;
    const pending: ChatMessage = { id: replyId, role: 'assistant', kind: 'pending' };
    setMessages((prev) =>
      retryId
        ? prev.map((message) => (message.id === retryId ? pending : message))
        : [...prev, { id: userId, role: 'user', text }, pending],
    );
    setIsBusy(true);
    setDraft('');
    setHint(null);
    try {
      const answer = await answerQuestion(text, {
        retrieval: 'hybrid',
        top_k: 3,
        mode: 'context',
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
            ? { id: replyId, role: 'assistant', kind: 'error', text: errorText, question: text }
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

  useEffect(
    () => () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    },
    [],
  );

  // 홈에서 넘어온 질문: 주소의 ?q=를 지워 새로고침해도 다시 보내지 않게 하고, 답변을 이어 붙인다.
  useEffect(() => {
    if (!initialQuestion) return;
    const timer = setTimeout(() => {
      window.history.replaceState(null, '', '/chat');
      void ask(initialQuestion);
    }, 0);
    return () => clearTimeout(timer);
  }, [initialQuestion, ask]);

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

  const pickSituation = (situation: Situation) => {
    fillDraft(situation.starter);
    setHint(situation.hint);
  };

  const send = () => {
    void ask(draft);
  };

  const startNewChat = () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setIsBusy(false);
    setMessages([INTRO_MESSAGE]);
    setDraft('');
    setHint(null);
    showToast('새 상담을 시작했어요.');
  };

  return (
    <div className={styles.chatPage} data-immersive>
      <aside className={styles.chatHistory} aria-label="상담 기록">
        <button className={styles.newChat} type="button" onClick={startNewChat}>
          <Icon name="plus" size={18} /> 새 상담 시작
        </button>
        <p className={styles.historyLabel}>이번 상담의 질문</p>
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
                return <IntroMessage key={message.id} onSelect={pickSituation} />;
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
                    onRetry={() => void ask(message.question, message.id)}
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
            {hint && <p className={styles.composerHint}>{hint}</p>}
            <textarea
              ref={inputRef}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              enterKeyHint="send"
              placeholder="지금 겪는 상황을 적어 주세요"
              aria-label="상담 내용"
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
                disabled={!draft.trim() || isBusy}
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
