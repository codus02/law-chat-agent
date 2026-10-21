'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/common/Icon';
import { cx } from '@/lib/cx';
import {
  ABOUT_NAV,
  LAW_SCOPE,
  MAIN_NAV,
  SITE_NAME,
} from '@/lib/site';
import { useLawStatus } from '@/lib/use-law-status';
import styles from './shell.module.css';

const TAB_ITEMS = [...MAIN_NAV, ABOUT_NAV];

/** 메신저처럼 화면 전체를 쓰는 경로. 휴대폰에서 상단 앱바와 하단 탭바를 숨긴다. */
const IMMERSIVE_PATHS = ['/chat'];

function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function SiteNav() {
  const pathname = usePathname();
  const isImmersive = IMMERSIVE_PATHS.includes(pathname);
  const lawStatus = useLawStatus();

  return (
    <>
      {/* 휴대폰·태블릿: 상단 앱바 */}
      {!isImmersive && (
        <header className={styles.appBar}>
          <Link className={styles.appBarBrand} href="/">
            <span className={styles.brandMark} aria-hidden="true">
              로
            </span>
            <strong>{SITE_NAME}</strong>
          </Link>
          <Link className={styles.lawChip} href="/about#data">
            <span className={styles.pulseDot} aria-hidden="true" />
            <span className={styles.visuallyHidden}>
              법령 {lawStatus.longDate}까지 확인, {lawStatus.note}
            </span>
            <span aria-hidden="true">법령 {lawStatus.shortDate} 확인</span>
          </Link>
        </header>
      )}

      {/* 데스크톱: 왼쪽 사이드바 */}
      <aside className={styles.sidebar} aria-label="사이드 메뉴">
        <Link className={styles.brand} href="/" aria-label={`${SITE_NAME} 홈`}>
          <span className={styles.brandMark} aria-hidden="true">
            로
          </span>
          <span className={styles.brandCopy}>
            <strong>{SITE_NAME}</strong>
            <small>알바 노동법 상담</small>
          </span>
        </Link>

        <nav className={styles.sideNav} aria-label="주요 메뉴">
          <p className={styles.navLabel}>서비스</p>
          {MAIN_NAV.map((item) => {
            const isActive = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(styles.navItem, isActive && styles.isActive)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <Link className={styles.lawStatus} href="/about#data">
            <span className={styles.statusRow}>
              <span className={styles.pulseDot} aria-hidden="true" />
              <strong>법령 현행성</strong>
            </span>
            <span>{lawStatus.longDate}까지 확인</span>
            <small>{lawStatus.note} · {LAW_SCOPE}</small>
          </Link>
          <Link
            href={ABOUT_NAV.href}
            className={cx(
              styles.navItem,
              styles.muted,
              isActivePath(pathname, ABOUT_NAV.href) && styles.isActive,
            )}
            aria-current={isActivePath(pathname, ABOUT_NAV.href) ? 'page' : undefined}
          >
            <Icon name={ABOUT_NAV.icon} />
            <span>{ABOUT_NAV.label}</span>
          </Link>
        </div>
      </aside>

      {/* 휴대폰·태블릿: 엄지로 닿는 하단 탭바 */}
      {!isImmersive && (
        <nav className={styles.tabBar} aria-label="주요 메뉴">
          {TAB_ITEMS.map((item) => {
            const isActive = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(styles.tabItem, isActive && styles.isActive)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon name={item.icon} size={22} />
                <span>{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
