const PATHS = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M10 20v-6h4v6',
  contract: 'M8 3h8l4 4v14H4V3h4Zm7 0v5h5M8 13h8M8 17h5',
  chat: 'M4 5h16v11H9l-5 4V5Zm4 5h8M8 13h5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-9.5v.5',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
  arrowLeft: 'M19 12H5m6 6-6-6 6-6',
  arrowUp: 'M12 19V5m-6 6 6-6 6 6',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  phone:
    'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  book: 'M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2V5Zm0 16a2 2 0 0 1 2-2h14',
} as const;

export type IconName = keyof typeof PATHS;

type IconProps = { name: IconName; size?: number; className?: string };

/** 장식용 선 아이콘. 의미가 필요한 곳에서는 옆에 텍스트를 함께 둔다. */
export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
