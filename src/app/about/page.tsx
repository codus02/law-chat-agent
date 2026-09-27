import type { Metadata } from 'next';
import { BackLink, ContentWrap, Kicker } from '@/components/common/PageParts';
import { cx } from '@/lib/cx';
import { COLLECTED_LAWS, HOTLINE, LAW_COLLECTED_DATE, LEGAL_NOTICE } from '@/lib/site';
import styles from './about.module.css';

export const metadata: Metadata = {
  title: '서비스 소개',
};

const PIPELINE = [
  { step: '01', title: '질문 분석', caption: '일상어 사연에서 쟁점과 사실 분리' },
  { step: '02', title: '혼합 검색', caption: 'BM25 + 임베딩으로 조문 찾기' },
  { step: '03', title: '답변 생성', caption: '찾은 법령 안에서만 답변' },
  { step: '04', title: '주장 검증', caption: '문장과 근거 원문 재대조', accent: true },
];

const STATUS = [
  {
    label: '근로조건 직접 점검',
    state: '동작',
    text: '최저임금·휴게시간 등 기본 규칙으로 바로 확인해요.',
  },
  {
    label: '노동법 상담 답변',
    state: '시연',
    text: '검색·생성 모델 연결 전이라 예시 답변을 보여줘요.',
  },
  { label: '계약서 분석', state: '시연', text: '문서 인식·분석 연결 전이라 예시 결과를 보여줘요.' },
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
          로바로는 법률 용어나 질문 작성법을 몰라도 알바생이 자신의 상황에 맞는 법 조문과 다음
          행동을 확인하도록 돕는 연구용 프로토타입입니다. 검색·재정렬·주장 단위 검증이 노동법 답변의
          신뢰성을 얼마나 높이는지 함께 연구합니다.
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

        <section className={styles.section} id="data" aria-labelledby="data-title">
          <h2 id="data-title">데이터 기준</h2>
          <p className={styles.sectionLead}>
            국가법령정보센터에서 {LAW_COLLECTED_DATE} 기준으로 시행 중인 현행 법령만 수집했어요.
            과거 시행본과 시행 예정본은 포함하지 않아요.
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
