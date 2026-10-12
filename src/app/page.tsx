import Link from 'next/link';
import { AnswerCard } from '@/components/chat/AnswerCard';
import { Icon } from '@/components/common/Icon';
import { QuestionStarter } from '@/components/home/QuestionStarter';
import { DEMO_NOTICE, HOTLINE, LAW_COLLECTED_DATE, LAW_SCOPE, LEGAL_NOTICE } from '@/lib/site';
import { SAMPLE_ANSWER } from '@/mocks/chat';
import styles from '@/components/home/home.module.css';

const DIFFERENCES = [
  {
    title: '법 조문 원문을 함께 보여줘요',
    text: '어느 법 몇 조인지, 언제 수집한 법령인지 확인할 수 있어요.',
  },
  {
    title: '필요한 것만 다시 물어봐요',
    text: '판단에 꼭 필요한 사실이 빠졌을 때만 짧게 확인해요.',
  },
  {
    title: '근거가 부족하면 단정하지 않아요',
    text: '확인되지 않은 내용은 판단을 미루고 상담처를 안내해요.',
  },
];

export default function HomePage() {
  return (
    <div className={styles.homePage}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>알바생을 위한 노동법 상담</p>
        <h1>
          일하기 전에도,
          <br />
          <em>일하는 중에도</em> 든든하게.
        </h1>
        <p className={styles.lead}>
          법 용어를 몰라도 괜찮아요. 상황을 말하면 관련 법 조문을 찾아 근거와 함께 알려드려요.
        </p>
      </section>

      <div className={styles.entryGrid}>
        {/* 1순위 진입: 문제가 생긴 뒤 바로 묻기 */}
        <section className={styles.askSection} aria-labelledby="ask-title">
          <div className={styles.sectionHead}>
            <span className={styles.stage}>일하는 중 · 그만둔 후</span>
            <h2 id="ask-title">지금 겪는 상황을 적어 주세요</h2>
          </div>
          <QuestionStarter />
        </section>

        {/* 2순위 진입: 계약 전 예방 점검 */}
        <section className={styles.contractSection} aria-labelledby="contract-title">
          <div className={styles.sectionHead}>
            <span className={styles.stage}>계약 전 · 입사 전</span>
            <h2 id="contract-title">근로계약서, 서명 전에 확인하세요</h2>
          </div>
          <div className={styles.contractCard}>
            <p>
              고용노동부 표준 양식을 참고해 근로계약서를 작성하거나, 시급·근무 요일·휴게시간 등
              근로조건을 점검해 보세요.
            </p>
            <div className={styles.contractActions}>
              <Link
                className={`${styles.primaryAction} ${styles.writeAction}`}
                href="/contract?tab=write"
              >
                <Icon name="edit" size={18} />
                근로계약서 작성
              </Link>
              <Link className={styles.secondaryAction} href="/contract">
                <Icon name="edit" size={18} />
                조건 직접 입력
              </Link>
              <Link className={styles.secondaryAction} href="/contract?tab=upload">
                <Icon name="upload" size={18} />
                계약서 올리기
              </Link>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.previewSection} aria-labelledby="preview-title">
        <div className={styles.sectionHead}>
          <span className={styles.stage}>답변 예시</span>
          <h2 id="preview-title">이렇게 근거와 함께 답해요</h2>
        </div>
        <div className={styles.previewGrid}>
          <div className={styles.preview}>
            <p className={styles.previewQuestion}>{SAMPLE_ANSWER.question}</p>
            <AnswerCard answer={SAMPLE_ANSWER} compact />
          </div>
          <ul className={styles.differences}>
            {DIFFERENCES.map((item) => (
              <li key={item.title}>
                <span className={styles.differenceMark} aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className={styles.homeFooter}>
        <a className={styles.hotline} href={`tel:${HOTLINE.number}`}>
          <span className={styles.hotlineIcon} aria-hidden="true">
            <Icon name="phone" size={20} />
          </span>
          <span>
            <small>급하거나 이미 분쟁 중이라면</small>
            <strong>
              {HOTLINE.name} {HOTLINE.number}
            </strong>
          </span>
          <Icon name="arrowRight" size={18} className={styles.hotlineArrow} />
        </a>
        <p className={styles.dataBasis}>
          <Icon name="book" size={16} />
          {LAW_COLLECTED_DATE} 수집한 {LAW_SCOPE} 기준 · <Link href="/about#data">자세히 보기</Link>
        </p>
        <p className={styles.legalNotice}>
          {LEGAL_NOTICE} {DEMO_NOTICE}
        </p>
      </footer>
    </div>
  );
}
