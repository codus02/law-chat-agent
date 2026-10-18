'use client';

import { useLawStatus } from '@/lib/use-law-status';

export function LawVerifiedDate() {
  const { longDate } = useLawStatus();
  return <>{longDate}</>;
}

export function LawStatusNote() {
  const { note } = useLawStatus();
  return <>{note}</>;
}
