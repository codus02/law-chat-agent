import type { Metadata } from 'next';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { isCategoryId } from '@/lib/categories';
import { MAX_MESSAGE_LENGTH } from '@/lib/chat';

export const metadata: Metadata = {
  title: '노동법 상담',
};

export default async function ChatPage({ searchParams }: PageProps<'/chat'>) {
  // 홈의 상황 입력창에서 넘어온 첫 질문(q)과 상황 칩에 대응하는 상담 유형(c)
  const { q, c } = await searchParams;
  const initialQuestion = typeof q === 'string' ? q.trim().slice(0, MAX_MESSAGE_LENGTH) : '';
  const initialCategory = isCategoryId(c) ? c : null;

  return <ChatRoom initialQuestion={initialQuestion} initialCategory={initialCategory} />;
}
