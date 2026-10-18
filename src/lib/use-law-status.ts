'use client';

import { useEffect, useState } from 'react';
import { LAW_COLLECTED_DATE, LAW_COLLECTED_SHORT } from '@/lib/site';

type LawStatus = {
  verified_through: string;
  last_result: 'unchanged' | 'changed' | 'failed';
  today_supported: boolean;
};

function formatLongDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[1]}. ${match[2]}. ${match[3]}.` : LAW_COLLECTED_DATE;
}

function formatShortDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[2]}.${match[3]}` : LAW_COLLECTED_SHORT;
}

export function useLawStatus() {
  const [status, setStatus] = useState<LawStatus | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      fetch('/api/law-status', { cache: 'no-store', signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: LawStatus | null) => {
          if (payload?.verified_through) setStatus(payload);
        })
        .catch(() => undefined);
    void load();
    const interval = window.setInterval(load, 60 * 60 * 1000);
    return () => {
      window.clearInterval(interval);
      controller.abort();
    };
  }, []);

  const verifiedThrough = status?.verified_through ?? '';
  const current = status?.last_result === 'unchanged' && status.today_supported;
  return {
    current,
    longDate: verifiedThrough ? formatLongDate(verifiedThrough) : LAW_COLLECTED_DATE,
    shortDate: verifiedThrough ? formatShortDate(verifiedThrough) : LAW_COLLECTED_SHORT,
    note: current ? '매일 자동 확인' : '자동 확인 점검 필요',
  };
}
