// 계약서 분석 API 연결 전까지 보여주는 예시 결과

export type RiskLevel = 'danger' | 'warning' | 'safe';

export type ContractRisk = {
  level: RiskLevel;
  label: string;
  title: string;
  description: string;
  basisLabel: string;
  basis: string;
};

export const SAMPLE_CHECKED_ITEMS = 7;

export const SAMPLE_RISKS: ContractRisk[] = [
  {
    level: 'danger',
    label: '확인 필요',
    title: '휴게시간이 명확하지 않아요',
    description:
      '“업무 상황에 따라 휴게”라는 표현만으로는 휴게시간의 길이와 부여 시점을 확인하기 어렵습니다.',
    basisLabel: '근거',
    basis: '근로기준법 제54조',
  },
  {
    level: 'warning',
    label: '주의',
    title: '연장근로수당 포함 범위 확인',
    description:
      '월 급여에 연장근로수당이 포함되어 있으나 시간 수와 계산 기준이 구체적으로 기재되지 않았습니다.',
    basisLabel: '근거',
    basis: '근로기준법 제56조',
  },
  {
    level: 'safe',
    label: '적정',
    title: '임금 지급 조건',
    description: '기본급, 지급일, 지급 방법이 서면에 구체적으로 명시되어 있습니다.',
    basisLabel: '확인',
    basis: '근로기준법 제17조',
  },
];
