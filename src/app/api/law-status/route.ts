import { NextResponse } from 'next/server';
import pinsData from '@/data/law-watch-pins.json';

export const runtime = 'nodejs';

const LAST_VERIFIED_FALLBACK = '2026-10-18';
const PINNED_LAWS = [
  { lawId: '000129', name: '최저임금법', mst: '218303', exactVersion: true },
  { lawId: '001872', name: '근로기준법', mst: '283457', exactVersion: false },
  { lawId: '003058', name: '근로기준법 시행령', mst: '270551', exactVersion: true },
  {
    lawId: '010356',
    name: '기간제 및 단시간근로자 보호 등에 관한 법률',
    mst: '232201',
    exactVersion: false,
  },
] as const;

type LawRow = Record<string, unknown>;
type Pin = { law_id: string; article: string; branch: string; text: string };
const PINS = pinsData as Pin[];

function todayKst() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function compactDate(value: unknown) {
  return String(value ?? '').replace(/[-.]/g, '');
}

function rowsFrom(payload: unknown): LawRow[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = (payload as Record<string, unknown>).LawSearch;
  if (!root || typeof root !== 'object') return [];
  const rows = (root as Record<string, unknown>).law;
  if (Array.isArray(rows)) return rows.filter((row): row is LawRow => !!row && typeof row === 'object');
  return rows && typeof rows === 'object' ? [rows as LawRow] : [];
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === null || value === undefined || value === '' ? [] : [value];
}

function cleanText(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, '')
    .replace(/ㆍ/g, '·');
}

function legalText(value: unknown): string {
  if (Array.isArray(value)) return value.map(legalText).filter(Boolean).join('\n');
  if (!value || typeof value !== 'object') return '';
  const node = value as LawRow;
  const own = ['조문내용', '항내용', '호내용', '목내용']
    .map((key) => node[key])
    .filter((part): part is string => typeof part === 'string');
  const children = ['항', '호', '목'].flatMap((key) => asArray(node[key]).map(legalText));
  return [...own, ...children].filter(Boolean).join('\n');
}

async function currentLaw(name: string, today: string, credential: string) {
  const query = new URLSearchParams({
    OC: credential,
    target: 'eflaw',
    type: 'JSON',
    query: name,
    search: '1',
    nw: '3',
    display: '100',
    page: '1',
    sort: 'efdes',
  });
  const response = await fetch(`https://www.law.go.kr/DRF/lawSearch.do?${query}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
    headers: { 'User-Agent': 'LaborRAGResearch/0.1' },
  });
  if (!response.ok) throw new Error(`law API ${response.status}`);
  const todayCompact = compactDate(today);
  const candidates = rowsFrom(await response.json())
    .filter((row) => row['법령명한글'] === name)
    .filter((row) => !['연혁', '시행예정', '폐지'].includes(String(row['현행연혁코드'] ?? '')))
    .filter((row) => !String(row['제개정구분명'] ?? '').includes('폐지'))
    .filter((row) => compactDate(row['시행일자']) <= todayCompact)
    .filter((row) => compactDate(row['공포일자']) <= todayCompact)
    .sort((a, b) =>
      `${compactDate(b['시행일자'])}${compactDate(b['공포일자'])}`.localeCompare(
        `${compactDate(a['시행일자'])}${compactDate(a['공포일자'])}`,
      ),
    );
  if (!candidates.length) throw new Error('current law not found');
  const selected = candidates[0];
  const mst = String(selected['법령일련번호'] ?? '');
  const effectiveDate = compactDate(selected['시행일자']);
  const detailQuery = new URLSearchParams({
    OC: credential,
    target: 'eflaw',
    type: 'JSON',
    MST: mst,
    efYd: effectiveDate,
  });
  const detailResponse = await fetch(`https://www.law.go.kr/DRF/lawService.do?${detailQuery}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
    headers: { 'User-Agent': 'LaborRAGResearch/0.1' },
  });
  if (!detailResponse.ok) throw new Error(`law detail API ${detailResponse.status}`);
  const detail = (await detailResponse.json()) as LawRow;
  const law = detail['법령'];
  if (!law || typeof law !== 'object') throw new Error('law body not found');
  const articlesRoot = (law as LawRow)['조문'];
  if (!articlesRoot || typeof articlesRoot !== 'object') throw new Error('articles not found');
  const articles = asArray((articlesRoot as LawRow)['조문단위']).filter(
    (article): article is LawRow => !!article && typeof article === 'object',
  );
  return { mst, articles };
}

export async function GET() {
  const today = todayKst();
  const credential = process.env.LAW_API_OC?.trim() || 'test';

  try {
    const changed: string[] = [];
    let compared = 0;
    for (const lawPin of PINNED_LAWS) {
      const current = await currentLaw(lawPin.name, today, credential);
      if (lawPin.exactVersion && current.mst !== lawPin.mst) {
        changed.push(`${lawPin.name} 부칙·별표 판본`);
      }
      for (const pin of PINS.filter((candidate) => candidate.law_id === lawPin.lawId)) {
        const article = current.articles.find(
          (candidate) =>
            candidate['조문여부'] === '조문' &&
            String(candidate['조문번호'] ?? '') === pin.article &&
            String(candidate['조문가지번호'] ?? '') === pin.branch,
        );
        compared += 1;
        if (!article || cleanText(legalText(article)) !== pin.text) {
          changed.push(`${lawPin.name} 제${pin.article}조${pin.branch ? `의${pin.branch}` : ''}`);
        }
      }
    }
    const unchanged = changed.length === 0;
    return NextResponse.json(
      {
        verified_through: unchanged ? today : LAST_VERIFIED_FALLBACK,
        today,
        today_supported: unchanged,
        last_result: unchanged ? 'unchanged' : 'changed',
        changed,
        pinned_laws_compared: PINNED_LAWS.length,
        pinned_articles_compared: compared,
        source: 'law.go.kr Open API',
      },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch {
    return NextResponse.json(
      {
        verified_through: LAST_VERIFIED_FALLBACK,
        today,
        today_supported: false,
        last_result: 'failed',
        changed: [],
        source: 'law.go.kr Open API',
      },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } },
    );
  }
}
