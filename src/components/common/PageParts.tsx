import Link from 'next/link';
import { cx } from '@/lib/cx';
import { Icon } from './Icon';
import { LawStatusNote, LawVerifiedDate } from './LawVerifiedDate';
import styles from './common.module.css';

export function ContentWrap({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cx(styles.contentWrap, className)}>{children}</div>;
}

export function BackLink() {
  return (
    <Link className={styles.backLink} href="/">
      <Icon name="arrowLeft" size={16} /> 서비스 홈
    </Link>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <span className={styles.kicker}>{children}</span>;
}

export function LawDateBadge() {
  return (
    <span className={styles.lawDate}>
      <i aria-hidden="true" /> <LawVerifiedDate />까지 확인 · <LawStatusNote />
    </span>
  );
}

export function PageHeading({
  kicker,
  title,
  description,
  aside,
}: {
  kicker: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className={styles.pageHeading}>
      <div>
        <Kicker>{kicker}</Kicker>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aside}
    </div>
  );
}
