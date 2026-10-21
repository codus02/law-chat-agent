import type { Metadata } from 'next';
import { LawStatusNote, LawVerifiedDate } from '@/components/common/LawVerifiedDate';
import { BackLink, ContentWrap, Kicker } from '@/components/common/PageParts';
import { cx } from '@/lib/cx';
import { COLLECTED_LAWS, HOTLINE, LEGAL_NOTICE } from '@/lib/site';
import styles from './about.module.css';

export const metadata: Metadata = {
  title: '서비스 소개',
};

const PIPELINE = [
  { step: '01', title: '상황 읽기', caption: '일상어 사연에서 시급·근무시간 같은 사실을 읽어요' },
  { step: '02', title: '규칙 점검', caption: '계산할 수 있는 문제는 고정한 법령 원문으로 바로 계산' },
  { step: '03', title: '추가 질문', caption: '결론을 바꿀 사실이 빠졌을 때만 한 번' },
  {
    step: '04',
    title: 'AI 판정',
    caption: '미세조정한 Gemma 3 4B가 검색된 법령을 읽고 판단',
    accent: true,
  },
];

const STATUS = [
  {
    label: '노동법 상담 판정',
    state: '동작',
    text: '모든 질문에 침해인지 아닌지 답하고, 법적 근거와 대응 방법을 함께 보여줘요.',
  },
  {
    label: '근로계약서 작성·점검',
    state: '동작',
    text: '표준근로계약서 항목을 채우거나 받은 계약서(PDF·DOCX·TXT)를 올리면 브라우저 안에서 읽어 점검해요.',
  },
  {
    label: '법령 현행성 확인',
    state: '동작',
    text: '판정에 쓰는 조문이 지금 시행 중인 법령과 같은지 매일 국가법령정보센터에서 확인해요.',
  },
];

/** 5-fold 교차검증 결과 (전문가 검수 사례 중 정답이 침해·침해 아님인 94건, 규칙 점검 + AI 판정) */
const RESULTS = [
  { value: '88.3%', label: '판정 정확도', note: '학습 전 모델 78.7%' },
  { value: '0.81', label: 'macro-F1', note: '학습 전 0.44' },
  { value: '89.9%', label: '침해 판정 정밀도', note: '"침해"라고 한 것 중 실제 침해' },
  { value: '0.5초', label: '규칙 점검 응답', note: 'AI 판정은 노트북에서 약 3분' },
];

export default function AboutPage() {
  return (
    <div className={styles.aboutPage}>
      <ContentWrap className={styles.narrow}>
        <BackLink />
        <div className={styles.kickerRow}>
          <Kicker>ABOUT LOVARO</Kicker>
        </div>
        <h1>
          답을 만드는 것보다
          <br />
          <em>답을 믿을 수 있게.</em>
        </h1>
        <p className={styles.aboutLead}>
          로바로는 법률 용어나 질문 작성법을 몰라도 알바생이 자신의 상황이 법에 맞는지 바로
          확인하도록 돕는 연구용 프로토타입입니다. 계산할 수 있는 문제는 규칙으로, 나머지는 노동
          상담 사례로 미세조정한 로컬 AI 모델로 판단하고, 모든 판단에 법적 근거와 대응 방법을
          붙입니다. 외부 AI API 없이 노트북 안에서 돌아가요.
        </p>

        <section className={styles.section} aria-labelledby="pipeline-title">
          <h2 id="pipeline-title">답변을 만드는 과정</h2>
          <ol className={styles.pipeline}>
            {PIPELINE.map((item) => (
              <li key={item.step} className={cx(styles.stage, item.accent && styles.accent)}>
                <span>{item.step}</span>
                <strong>{item.title}</strong>
                <small>{item.caption}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} id="results" aria-labelledby="results-title">
          <h2 id="results-title">검증 결과</h2>
          <p className={styles.sectionLead}>
            전문가가 검수한 알바 상담 사례로 5-fold 교차검증한 값이에요.
          </p>
          <ul className={styles.results}>
            {RESULTS.map((item) => (
              <li key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <small>{item.note}</small>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            정답이 침해·침해 아님인 94건 기준이에요. 같은 사례를 다른 묶음의 학습에도 썼기 때문에
            처음 보는 질문에서는 이보다 낮을 수 있어요. 정답의 79%가 &quot;침해&quot;라서 정확도와
            함께 두 판정을 고르게 보는 macro-F1을 봐요.
          </p>
        </section>

        <section className={styles.section} id="data" aria-labelledby="data-title">
          <h2 id="data-title">데이터 기준</h2>
          <p className={styles.sectionLead}>
            국가법령정보센터에서 수집한 법령을 <LawVerifiedDate />까지 확인했어요.{' '}
            <LawStatusNote />하며, 과거 시행본과 시행 예정본은 포함하지 않아요.
          </p>
          <ul className={styles.lawList}>
            {COLLECTED_LAWS.map((law) => (
              <li key={law.name}>
                <strong>{law.name}</strong>
                <small>{law.effectiveFrom} 시행</small>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            2026년 최저임금 고시 원문도 함께 보관해요. 고용노동부·1350 FAQ는 현행 법령과 대조해
            16건을 실험용으로 추렸고, 판례·행정해석은 아직 포함하지 않았어요.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="status-title">
          <h2 id="status-title">지금 쓸 수 있는 기능</h2>
          <ul className={styles.statusList}>
            {STATUS.map((item) => (
              <li key={item.label}>
                <span
                  className={cx(styles.statusBadge, item.state === '동작' && styles.statusLive)}
                >
                  {item.state}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className={styles.note}>
          {LEGAL_NOTICE} 도움이 급하면 {HOTLINE.name}(☎ {HOTLINE.number})에 문의하세요.
        </p>
      </ContentWrap>
    </div>
  );
}
