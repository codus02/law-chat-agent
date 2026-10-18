import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// 사실 확인(intake)과 검색은 규칙·색인만 쓰므로 수십 ms 안에 끝난다.
// 생성 답변(answer)은 CPU에서 모델을 처음 불러올 때 수 분이 걸릴 수 있다.
const TIMEOUT_MS: Record<string, number> = {
  answer: 300_000,
  search: 30_000,
  intake: 30_000,
  // 긴 글 자세히 읽기: 로컬 LLM이 CPU에서 글당 1분 안팎 걸린다.
  'intake-deep': 300_000,
};

export async function POST(request: NextRequest, context: RouteContext<'/api/rag/[action]'>) {
  const { action } = await context.params;
  const timeoutMs = TIMEOUT_MS[action];
  if (!timeoutMs) {
    return Response.json({ detail: '지원하지 않는 요청입니다.' }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ detail: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const baseUrl = (process.env.RAG_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const bridgeToken = process.env.RAG_PROXY_TOKEN?.trim();
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    const upstream = await fetch(`${baseUrl}/api/rag/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bridgeToken ? { Authorization: `Bearer ${bridgeToken}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.any([request.signal, timeout]),
    });
    const body = await upstream.json();
    return Response.json(body, {
      status: upstream.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    if (timeout.aborted) {
      return Response.json(
        { detail: '답변 생성 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.' },
        { status: 504 },
      );
    }
    return Response.json(
      {
        detail: process.env.VERCEL
          ? '현재 배포 상담 서버와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'
          : '상담 서버(127.0.0.1:8000)에 연결할 수 없어요. 프로젝트 루트에서 scripts/start_local.ps1을 실행했는지 확인해 주세요.',
      },
      { status: 503 },
    );
  }
}
