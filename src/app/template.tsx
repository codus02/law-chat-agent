import styles from './template.module.css';

/** 경로가 바뀔 때마다 다시 마운트되어 페이지 진입 애니메이션을 재생한다. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}
