import type { AnswerResult } from '@/lib/rag-client';
import styles from './answer.module.css';

const LABELS: Record<AnswerResult['status'], string> = {
  answered: '검색 근거를 바탕으로 답변했어요',
  needs_more_info: '확인이 더 필요해요',
  insufficient_evidence: '답변에 필요한 근거가 부족해요',
  evidence_only: '검색된 근거를 확인해 주세요',
  experimental_unverified: '실험용 답변이에요',
};

export function RagAnswerCard({
  answer,
  onRefine,
}: {
  answer: AnswerResult;
  onRefine: (text: string) => void;
}) {
  return (
    <div className={styles.answerCard} data-rag-answer>
      <div className={styles.status}>
        <strong>{LABELS[answer.status]}</strong>
      </div>
      <div className={styles.block}>
        <p className={styles.blockLabel}>답변</p>
        <p className={styles.ragText}>{answer.answer}</p>
        <p className={styles.metadata}>
          자료 기준일 {answer.as_of_date} · 검색 근거 {answer.sources.length}건
        </p>
      </div>
      {answer.follow_up_questions.length > 0 && (
        <div className={styles.followUp}>
          <p className={styles.blockLabel}>추가로 확인할 내용</p>
          <ul className={styles.nextSteps}>
            {answer.follow_up_questions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
          <div className={styles.options}>
            <button type="button" onClick={() => onRefine(`${answer.question}\n추가 정보: `)}>
              근무조건을 추가해서 다시 질문하기
            </button>
          </div>
        </div>
      )}
      {answer.claims.length > 0 && (
        <details className={styles.sources}>
          <summary className={styles.sourcesTitle}>
            답변에 인용한 문장 {answer.claims.length}건
          </summary>
          {answer.claims.map((claim, index) => (
            <div className={styles.source} key={index}>
              <span className={styles.sourceNumber}>{claim.source_id}</span>
              <div>
                <strong>
                  {answer.sources.find((source) => source.id === claim.source_id)?.title}
                </strong>
                <q>{claim.quote}</q>
              </div>
            </div>
          ))}
        </details>
      )}
      {answer.sources.length > 0 && (
        <details className={styles.sources}>
          <summary className={styles.sourcesTitle}>검색된 근거 {answer.sources.length}건</summary>
          {answer.sources.map((source) => (
            <div className={styles.source} key={source.id}>
              <span className={styles.sourceNumber}>{source.id}</span>
              <div>
                <strong>{source.title}</strong>
                <small>
                  자료 기준일 {source.as_of_date}
                  {source.effective_from && ` · 시행일 ${source.effective_from}`}
                </small>
                <details className={styles.excerpt}>
                  <summary>근거 내용 펼치기</summary>
                  <p>{source.excerpt}</p>
                  {source.application_scope && <p>적용 범위: {source.application_scope}</p>}
                </details>
                {/^https?:\/\//i.test(source.url) && (
                  <a
                    className={styles.sourceLink}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    공식 출처 열기 ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </details>
      )}
      <p className={styles.verificationNote}>
        {answer.claims.length > 0 ? '인용문과 원문의 일치 여부만 확인했으며, ' : ''}
        법률 전문가의 검토를 거치지 않은 답변이에요.
      </p>
    </div>
  );
}
