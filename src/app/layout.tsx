import type { Metadata, Viewport } from 'next';
import { DM_Sans, Noto_Sans_KR } from 'next/font/google';
import { SiteNav } from '@/components/layout/SiteNav';
import { ToastProvider } from '@/components/common/Toast';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/site';
import styles from '@/components/layout/shell.module.css';
import './globals.css';

const notoSansKr = Noto_Sans_KR({
  variable: '--font-noto-sans-kr',
  subsets: ['latin'],
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#f8faf7',
  // 노치·홈 인디케이터 영역까지 그리고, 하단 탭바는 safe-area 여백으로 피한다.
  viewportFit: 'cover',
  // Android에서 키보드가 올라오면 레이아웃 높이를 줄여 상담 입력창이 가려지지 않게 한다.
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${dmSans.variable}`}>
      <body>
        <ToastProvider>
          <div className={styles.appShell}>
            <SiteNav />
            <main className={styles.mainContent}>{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
