import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Includes cold model loading on a CPU. Ollama's read timeout is 240 seconds.
const TIMEOUT_MS = 300_000;

export async function POST(request: NextRequest, context: RouteContext<'/api/rag/[action]'>) {
  const { action } = await context.params;
  if (action !== 'answer' && action !== 'search') {
    return Response.json({ detail: '지원하지 않는 요청입니다.' }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ detail: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const baseUrl = (process.env.RAG_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  try {
    const upstream = await fetch(`${baseUrl}/api/rag/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      { detail: '상담 서버에 연결할 수 없어요. 로컬 실행 스크립트가 실행 중인지 확인해 주세요.' },
      { status: 503 },
    );
  }
}
