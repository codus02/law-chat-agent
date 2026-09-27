export const SITE_NAME = '로바로';
export const SITE_TAGLINE = '알바생을 위한 근거 중심 노동법 상담';
export const SITE_DESCRIPTION =
  '법률 용어를 몰라도 상황을 말하면 관련 법 조문을 찾아 근거와 함께 안내하는 노동법 상담 서비스 프로토타입';

/**
 * 화면에 표시하는 법령 수집 기준. data/raw/statutes/current/*.metadata.json과 맞춘다.
 * 코퍼스를 다시 수집하면 함께 갱신한다.
 */
export const LAW_COLLECTED_DATE = '2026. 09. 25.';
export const LAW_COLLECTED_SHORT = '09.25';

export const COLLECTED_LAWS = [
  { name: '근로기준법', effectiveFrom: '2026. 08. 20.' },
  { name: '근로기준법 시행령', effectiveFrom: '2025. 10. 23.' },
  { name: '근로기준법 시행규칙', effectiveFrom: '2025. 02. 23.' },
  { name: '최저임금법', effectiveFrom: '2020. 05. 26.' },
  { name: '최저임금법 시행령', effectiveFrom: '2019. 01. 01.' },
  { name: '최저임금법 시행규칙', effectiveFrom: '2026. 01. 02.' },
  { name: '기간제 및 단시간근로자 보호 등에 관한 법률', effectiveFrom: '2021. 05. 18.' },
  { name: '기간제 및 단시간근로자 보호 등에 관한 법률 시행령', effectiveFrom: '2021. 04. 08.' },
  { name: '기간제 및 단시간근로자 보호 등에 관한 법률 시행규칙', effectiveFrom: '2007. 07. 01.' },
] as const;

export const LAW_SCOPE = `노동 관련 법령 ${COLLECTED_LAWS.length}건`;

/** 고용노동부 고객상담센터. 분쟁·긴급 상황에서 안내하는 공식 연락처. */
export const HOTLINE = { name: '고용노동부 고객상담센터', number: '1350' };

export const LEGAL_NOTICE =
  '로바로는 법률 정보를 제공하며, 변호사·노무사의 법률 자문을 대체하지 않습니다.';

export const DEMO_NOTICE = '현재 상담 답변과 계약서 분석 결과는 시연용 예시입니다.';

export type NavIcon = 'home' | 'contract' | 'chat' | 'info';

export type NavItem = { href: string; label: string; shortLabel: string; icon: NavIcon };

export const MAIN_NAV: NavItem[] = [
  { href: '/', label: '서비스 홈', shortLabel: '홈', icon: 'home' },
  { href: '/contract', label: '근로계약 점검', shortLabel: '계약 점검', icon: 'contract' },
  { href: '/chat', label: '노동법 상담', shortLabel: '상담', icon: 'chat' },
];

export const ABOUT_NAV: NavItem = {
  href: '/about',
  label: '서비스 소개',
  shortLabel: '소개',
  icon: 'info',
};
