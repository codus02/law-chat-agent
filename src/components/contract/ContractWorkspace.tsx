'use client';

import { useState } from 'react';
import { cx } from '@/lib/cx';
import { ConditionChecklist } from './ConditionChecklist';
import { ContractWriter } from './ContractWriter';
import { ContractUpload } from './ContractUpload';
import styles from './contract.module.css';

export type ContractTab = 'checklist' | 'write' | 'upload';

const TABS: { id: ContractTab; label: string }[] = [
  { id: 'checklist', label: '조건 직접 입력' },
  { id: 'write', label: '계약서 작성' },
  { id: 'upload', label: '계약서 올리기' },
];

export function ContractWorkspace({ initialTab }: { initialTab: ContractTab }) {
  const [activeTab, setActiveTab] = useState<ContractTab>(initialTab);

  const selectTab = (tab: ContractTab) => {
    setActiveTab(tab);
    // 새로고침·공유 시 같은 탭이 열리도록 주소만 바꾼다(페이지는 다시 불러오지 않음).
    window.history.replaceState(null, '', tab === 'checklist' ? '/contract' : `?tab=${tab}`);
  };

  // 두 패널을 모두 마운트해 두고 hidden으로만 전환해, 탭을 오가도 입력값이 남도록 한다.
  return (
    <>
      <div className={styles.modeTabs} role="tablist" aria-label="점검 방식">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`contract-tab-${tab.id}`}
            className={cx(styles.modeTab, activeTab === tab.id && styles.isActive)}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`contract-panel-${tab.id}`}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="contract-panel-checklist"
        className={styles.contractPanel}
        role="tabpanel"
        aria-labelledby="contract-tab-checklist"
        hidden={activeTab !== 'checklist'}
      >
        <ConditionChecklist />
      </div>
      <div
        id="contract-panel-write"
        className={styles.contractPanel}
        role="tabpanel"
        aria-labelledby="contract-tab-write"
        hidden={activeTab !== 'write'}
      >
        <ContractWriter />
      </div>
      <div
        id="contract-panel-upload"
        className={styles.contractPanel}
        role="tabpanel"
        aria-labelledby="contract-tab-upload"
        hidden={activeTab !== 'upload'}
      >
        <ContractUpload />
      </div>
    </>
  );
}
