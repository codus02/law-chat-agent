import type { Metadata } from 'next';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { MAX_MESSAGE_LENGTH } from '@/lib/chat';

export const metadata: Metadata = {
  title: '노동법 상담',
};

export default async function ChatPage({ searchParams }: PageProps<'/chat'>) {
  // 홈의 상황 입력창에서 넘어온 첫 질문
  const { q } = await searchParams;
  const initialQuestion = typeof q === 'string' ? q.trim().slice(0, MAX_MESSAGE_LENGTH) : '';

  return <ChatRoom initialQuestion={initialQuestion} />;
}
