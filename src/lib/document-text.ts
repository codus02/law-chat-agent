/**
 * 브라우저 안에서 파일의 본문 텍스트를 꺼낸다. 서버로 올리지 않는다.
 * - .txt: UTF-8, 깨지면 EUC-KR로 다시 읽는다.
 * - .docx: ZIP 안의 word/document.xml을 풀어 문단 텍스트만 남긴다.
 * - .pdf: pdf.js로 글자 위치를 읽어 줄 단위로 합친다. 스캔(이미지) PDF는 글자가 없어 실패한다.
 * - .hwp/.hwpx/이미지: 지원하지 않는다.
 */

export class UnsupportedDocumentError extends Error {}

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || file.type === 'text/plain') return readText(file);
  if (name.endsWith('.docx')) return readDocx(file);
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return readPdf(file);
  if (name.endsWith('.hwp') || name.endsWith('.hwpx')) {
    throw new UnsupportedDocumentError(
      'HWP 파일은 아직 읽지 못해요. 한글에서 PDF 또는 TXT로 저장해 올리거나 내용을 붙여 넣어 주세요.',
    );
  }
  if (file.type.startsWith('image/')) {
    throw new UnsupportedDocumentError(
      '사진은 글자 인식(OCR)을 지원하지 않아요. 계약서 내용을 붙여 넣어 주세요.',
    );
  }
  throw new UnsupportedDocumentError('PDF, DOCX, TXT 파일을 올리거나 내용을 붙여 넣어 주세요.');
}

async function readText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (!utf8.includes('�')) return utf8;
  try {
    return new TextDecoder('euc-kr').decode(bytes);
  } catch {
    return utf8;
  }
}

/* ───────── DOCX: 최소 ZIP 읽기 ───────── */

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntry(bytes: Uint8Array, wanted: string): Promise<Uint8Array | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    const dataStart = offset + 30 + nameLength + extraLength;
    const flags = view.getUint16(offset + 6, true);
    if ((flags & 0x08) !== 0 && compressedSize === 0) {
      // 데이터 디스크립터를 쓰는 항목은 중앙 디렉터리에서 크기를 찾아야 한다.
      return readZipEntryFromCentralDirectory(bytes, wanted);
    }
    const data = bytes.subarray(dataStart, dataStart + compressedSize);
    if (name === wanted) {
      return method === 8 ? inflateRaw(data) : method === 0 ? data : null;
    }
    offset = dataStart + compressedSize;
  }
  return readZipEntryFromCentralDirectory(bytes, wanted);
}

async function readZipEntryFromCentralDirectory(
  bytes: Uint8Array,
  wanted: string,
): Promise<Uint8Array | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // End of central directory record
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 70000); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) return null;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name === wanted) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const data = bytes.subarray(dataStart, dataStart + compressedSize);
      return method === 8 ? inflateRaw(data) : method === 0 ? data : null;
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

async function readDocx(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const xml = await readZipEntry(bytes, 'word/document.xml');
  if (!xml) throw new UnsupportedDocumentError('DOCX 안에서 본문을 찾지 못했어요.');
  const document = new TextDecoder().decode(xml);
  return document
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tc>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/* ───────── PDF ───────── */

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
    .promise;
  const pages: string[] = [];
  for (let number = 1; number <= document.numPages; number += 1) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    // 같은 줄(y 좌표가 비슷한 글자)을 모아 한 줄로 만든다.
    const lines = new Map<number, { x: number; text: string }[]>();
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      const line = lines.get(y) ?? [];
      line.push({ x: item.transform[4], text: item.str });
      lines.set(y, line);
    }
    const ordered = [...lines.entries()].sort((a, b) => b[0] - a[0]);
    pages.push(
      ordered
        .map(([, parts]) =>
          parts
            .sort((a, b) => a.x - b.x)
            .map((p) => p.text)
            .join(' '),
        )
        .join('\n'),
    );
  }
  const text = pages.join('\n');
  if (!text.trim())
    throw new UnsupportedDocumentError(
      '이 PDF에는 글자 정보가 없어요(스캔본). 계약서 내용을 붙여 넣어 주세요.',
    );
  return text;
}
