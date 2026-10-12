import Link from 'next/link';
import { Icon } from '@/components/common/Icon';
import { QuestionStarter } from '@/components/home/QuestionStarter';
import { DEMO_NOTICE, HOTLINE, LAW_COLLECTED_DATE, LAW_SCOPE, LEGAL_NOTICE } from '@/lib/site';
import styles from '@/components/home/home.module.css';

const STEPS = [
  {
    title: '유형을 고르고 상황을 적어요',
    text: '임금, 근로시간, 계약, 해고처럼 겪는 문제를 하나 고르고 말하듯 적으면 돼요.',
  },
  {
    title: '판정에 필요한 것만 확인해요',
    text: '적은 내용에서 읽은 값은 맞는지만 묻고, 빠진 값만 추가로 물어요. 모르면 비워 둬도 돼요.',
  },
  {
    title: '침해 여부·근거·대응을 알려드려요',
    text: '확인된 사실로만 판정하고, 법 조문 원문 링크와 다음에 할 일을 함께 보여줘요.',
  },
];

export default function HomePage() {
  return (
    <div className={styles.homePage}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>알바생을 위한 노동법 상담</p>
        <h1>
          내 알바 조건,
          <br />
          <em>법대로</em> 맞는지 바로 확인하세요.
        </h1>
        <p className={styles.lead}>
          시급·휴게시간·주휴수당·해고 같은 문제를 말하듯 적으면, 수집한 법 조문을 근거로 침해 여부와
          대응 방법을 알려드려요. 법 용어를 몰라도 괜찮아요.
        </p>
      </section>

      <section className={styles.askSection} aria-labelledby="ask-title">
        <div className={styles.sectionHead}>
          <span className={styles.stage}>지금 겪는 문제</span>
          <h2 id="ask-title">상황을 적고 상담을 시작하세요</h2>
        </div>
        <QuestionStarter />
      </section>

      <section className={styles.contractSection} aria-labelledby="contract-title">
        <div className={styles.sectionHead}>
          <span className={styles.stage}>계약 전·후</span>
          <h2 id="contract-title">근로계약서, 서명 전에 점검하세요</h2>
        </div>
        <div className={styles.contractCard}>
          <p>
            고용노동부 표준근로계약서 항목을 채우면 최저임금·휴게·주휴일 조건을 바로 확인해요. 이미
            받은 계약서는 올려서 같은 기준으로 점검해요.
          </p>
          <div className={styles.contractActions}>
            <Link className={styles.primaryAction} href="/contract">
              <Icon name="edit" size={18} />
              작성하며 점검하기
            </Link>
            <Link className={styles.secondaryAction} href="/contract?tab=upload">
              <Icon name="upload" size={18} />
              받은 계약서 올리기
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.stepsSection} aria-labelledby="steps-title">
        <div className={styles.sectionHead}>
          <span className={styles.stage}>이렇게 답해요</span>
          <h2 id="steps-title">세 단계로 끝나요</h2>
        </div>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className={styles.stepNumber} aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
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
