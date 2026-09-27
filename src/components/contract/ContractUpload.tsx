'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Icon } from '@/components/common/Icon';
import { Kicker } from '@/components/common/PageParts';
import { useToast } from '@/components/common/Toast';
import { cx } from '@/lib/cx';
import { SAMPLE_CHECKED_ITEMS, SAMPLE_RISKS, type RiskLevel } from '@/mocks/contract-analysis';
import styles from './contract.module.css';

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.hwp,.hwpx,.png,.jpg,.jpeg';
const MAX_FILE_BYTES = 20 * 1024 * 1024;
/** 실제 분석 API가 붙기 전까지 분석 대기 시간을 흉내 낸다. */
const MOCK_ANALYSIS_MS = 950;

const RISK_ICONS: Record<RiskLevel, string> = { danger: '!', warning: '△', safe: '✓' };

const STEPS = [
  { title: '문서 항목 추출', caption: '임금·시간·휴일·휴가 조건 구조화' },
  { title: '현행 법령 대조', caption: '적용 법률과 행정해석 검색' },
  { title: '위험도와 근거 제시', caption: '문제 조항 및 수정 방향 안내' },
];

export function ContractUpload() {
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedFileName, setAnalyzedFileName] = useState<string | null>(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const riskCount = SAMPLE_RISKS.filter((risk) => risk.level !== 'safe').length;

  const openFilePicker = () => {
    if (!isAnalyzing) fileInputRef.current?.click();
  };

  const analyze = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showToast('20MB 이하의 파일만 올릴 수 있어요.');
      return;
    }
    setIsAnalyzing(true);
    showToast('현행 법령과 계약 내용을 대조하고 있어요.');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      flushSync(() => {
        setAnalyzedFileName(file.name);
        setIsAnalyzing(false);
      });
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, MOCK_ANALYSIS_MS);
  };

  return (
    <>
      <div className={styles.uploadLayout}>
        <div className={styles.uploadCopy}>
          <Kicker>DOCUMENT REVIEW</Kicker>
          <h2>
            계약서 속 위험 조항을
            <br />
            근거와 함께 찾아드려요.
          </h2>
          <p>
            업로드한 문서는 분석 용도로만 사용되며, 이 프로토타입에서는 예시 분석 결과가 표시됩니다.
          </p>
          <ol>
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span>{index + 1}</span>
                <p>
                  <strong>{step.title}</strong>
                  <small>{step.caption}</small>
                </p>
              </li>
            ))}
          </ol>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          hidden
          onChange={(event) => {
            analyze(event.target.files?.[0]);
            // 같은 파일을 다시 골라도 change 이벤트가 발생하도록 비운다.
            event.target.value = '';
          }}
        />
        <div
          className={cx(styles.uploadZone, isDragging && styles.isDragging)}
          onClick={openFilePicker}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (!isAnalyzing) analyze(event.dataTransfer.files[0]);
          }}
        >
          <div className={styles.uploadIllustration} aria-hidden="true">
            <Icon name="upload" size={26} />
          </div>
          <h3>근로계약서를 올려 주세요</h3>
          <p>사진을 찍거나 파일을 고르세요. PC에서는 끌어다 놓아도 돼요.</p>
          {/* 클릭은 업로드 영역으로 전달되어 파일 선택 창을 연다. */}
          <button type="button" disabled={isAnalyzing}>
            {isAnalyzing ? '문서 분석 중…' : analyzedFileName ? '다른 파일 선택' : '파일 선택'}
          </button>
          <small>PDF, HWP, DOCX, JPG, PNG · 최대 20MB</small>
        </div>
      </div>

      {analyzedFileName && (
        <div ref={resultRef} className={styles.analysisDemo}>
          <div className={styles.analysisHeader}>
            <div>
              <span className={styles.fileSymbol} aria-hidden="true">
                ▤
              </span>
              <p>
                <strong>{analyzedFileName}</strong>
                <small>문서 분석 완료 · {SAMPLE_CHECKED_ITEMS}개 항목 확인</small>
              </p>
            </div>
            <span className={styles.riskSummary}>주의 {riskCount}건</span>
          </div>
          <div className={styles.riskGrid}>
            {SAMPLE_RISKS.map((risk) => (
              <article key={risk.title} className={cx(styles.riskCard, styles[risk.level])}>
                <div className={styles.riskTitle}>
                  <span aria-hidden="true">{RISK_ICONS[risk.level]}</span>
                  <p>
                    <small>{risk.label}</small>
                    <strong>{risk.title}</strong>
                  </p>
                </div>
                <p>{risk.description}</p>
                <div className={styles.evidenceLine}>
                  <span>{risk.basisLabel}</span> {risk.basis}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
