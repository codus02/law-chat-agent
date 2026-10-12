'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/common/Icon';
import { useToast } from '@/components/common/Toast';
import { checkDraft, summarize, type Draft } from '@/lib/contract-draft';
import { parseContractText, type ParsedContract } from '@/lib/contract-parse';
import { extractText, UnsupportedDocumentError } from '@/lib/document-text';
import { cx } from '@/lib/cx';
import styles from './contract-studio.module.css';

const ACCEPTED_TYPES = '.pdf,.docx,.txt';
const MAX_FILE_BYTES = 20 * 1024 * 1024;

/**
 * 받은 계약서를 읽어 표준근로계약서 초안으로 바꾼다. 파일은 브라우저 안에서만 읽고 서버로 보내지 않는다.
 */
export function ContractUpload({ onApply }: { onApply: (draft: Draft, source: string) => void }) {
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [pasted, setPasted] = useState('');
  const [parsed, setParsed] = useState<(ParsedContract & { source: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeText = (text: string, source: string) => {
    if (!text.trim()) {
      setError('읽을 수 있는 글자가 없어요.');
      return;
    }
    const result = parseContractText(text);
    setParsed({ ...result, source });
    setError(null);
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showToast('20MB 이하의 파일만 올릴 수 있어요.');
      return;
    }
    setIsReading(true);
    setError(null);
    try {
      const text = await extractText(file);
      analyzeText(text, file.name);
    } catch (caught) {
      setError(
        caught instanceof UnsupportedDocumentError
          ? caught.message
          : '파일을 읽지 못했어요. 내용을 붙여 넣어 주세요.',
      );
      setParsed(null);
    } finally {
      setIsReading(false);
    }
  };

  const review = parsed ? checkDraft(parsed.draft) : null;
  const counts = review ? summarize(review.findings) : null;

  return (
    <div className={styles.upload}>
      <div className={styles.uploadIntro}>
        <h2>받은 계약서를 같은 기준으로 점검해요</h2>
        <p>
          표준근로계약서 항목(계약기간, 근로시간·휴게, 근무일·주휴일, 임금, 사회보험, 교부)을
          본문에서 찾아 읽고, 작성 화면과 같은 조건으로 확인해요. 파일은 이 브라우저 안에서만 읽고
          서버로 보내지 않아요.
        </p>
      </div>

      <div className={styles.uploadGrid}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          hidden
          onChange={(event) => {
            void readFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <div
          className={cx(styles.dropZone, isDragging && styles.isDragging)}
          onClick={() => !isReading && fileInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
              setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (!isReading) void readFile(event.dataTransfer.files[0]);
          }}
        >
          <span className={styles.dropIcon} aria-hidden="true">
            <Icon name="upload" size={24} />
          </span>
          <strong>{isReading ? '읽는 중…' : 'PDF · DOCX · TXT 파일 올리기'}</strong>
          <small>
            누르거나 끌어다 놓으세요. HWP는 PDF로 저장해서, 사진은 아래에 내용을 붙여 넣어 주세요.
          </small>
        </div>

        <label className={styles.pasteBox}>
          <span>또는 계약서 내용을 붙여 넣기</span>
          <textarea
            rows={8}
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            placeholder={
              '예:\n1. 근로계약기간: 2026년 3월 1일부터 2026년 8월 31일까지\n2. 근무장소: ○○편의점\n4. 소정근로시간: 10시 00분부터 16시 00분까지 (휴게시간: 13시 00분~13시 30분)\n5. 근무일/휴일: 매주 월, 수, 금 근무, 주휴일 매주 일요일\n6. 임금: 시간급 10,320원 ...'
            }
          />
          <button
            type="button"
            disabled={!pasted.trim() || isReading}
            onClick={() => analyzeText(pasted, '붙여 넣은 내용')}
          >
            이 내용 읽기
          </button>
        </label>
      </div>

      {error && (
        <p className={styles.uploadError} role="alert">
          {error}
        </p>
      )}

      {parsed && review && counts && (
        <section className={styles.parsed} aria-live="polite">
          <header>
            <div>
              <strong>{parsed.source}</strong>
              <small>
                읽은 항목 {parsed.found.length}개 · 경고 {counts.danger} · 확인 {counts.warning} ·
                충족 {counts.ok}
              </small>
            </div>
            <button
              type="button"
              className={styles.applyButton}
              onClick={() => onApply(parsed.draft, parsed.source)}
            >
              작성 화면에서 고치며 점검하기
            </button>
          </header>
          {parsed.found.length === 0 ? (
            <p className={styles.uploadError}>
              표준근로계약서 항목을 찾지 못했어요. 항목명(근로계약기간, 소정근로시간, 임금 등)이
              있는 본문인지 확인해 주세요.
            </p>
          ) : (
            <dl className={styles.foundList}>
              {parsed.found.map((item) => (
                <div key={`${item.field}-${item.value}`}>
                  <dt>{item.field}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <ul className={styles.findings}>
            {review.findings
              .filter((f) => f.tone !== 'info')
              .map((f) => (
                <li key={f.title} className={cx(styles.finding, styles[f.tone])}>
                  <span className={styles.findingTone}>
                    {f.tone === 'danger' ? '경고' : f.tone === 'warning' ? '확인' : '충족'}
                  </span>
                  <div>
                    <strong>{f.title}</strong>
                    <p>{f.text}</p>
                    {f.basis && <small>근거 · {f.basis}</small>}
                  </div>
                </li>
              ))}
          </ul>
          <details className={styles.rawText}>
            <summary>읽어 들인 본문 보기</summary>
            <pre>{parsed.text.slice(0, 4000)}</pre>
          </details>
        </section>
      )}
    </div>
  );
}
