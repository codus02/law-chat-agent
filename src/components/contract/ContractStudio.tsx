'use client';

import { useState } from 'react';
import { createDraft, type Draft } from '@/lib/contract-draft';
import { cx } from '@/lib/cx';
import { ContractForm } from './ContractForm';
import { ContractUpload } from './ContractUpload';
import styles from './contract-studio.module.css';

export type ContractTab = 'write' | 'upload';

const TABS: { id: ContractTab; label: string }[] = [
  { id: 'write', label: '작성하며 점검' },
  { id: 'upload', label: '받은 계약서 올리기' },
];

/**
 * 근로계약서 한 화면. 작성과 점검을 분리하지 않고, 표준근로계약서 항목을 채우는 동안 조건부 경고가 뜬다.
 * 올린 계약서는 같은 초안 형태로 읽혀 같은 점검을 받는다.
 */
export function ContractStudio({ initialTab }: { initialTab: ContractTab }) {
  const [activeTab, setActiveTab] = useState<ContractTab>(initialTab);
  const [draft, setDraft] = useState<Draft>(() => createDraft());
  const [importedFrom, setImportedFrom] = useState<string | null>(null);

  const selectTab = (tab: ContractTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', tab === 'write' ? '/contract' : '/contract?tab=upload');
  };

  const applyImported = (next: Draft, source: string) => {
    setDraft(next);
    setImportedFrom(source);
    selectTab('write');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.studio}>
      <div className={styles.tabs} role="tablist" aria-label="계약서 점검 방식">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`contract-tab-${tab.id}`}
            className={cx(styles.tab, activeTab === tab.id && styles.isActive)}
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
        id="contract-panel-write"
        role="tabpanel"
        aria-labelledby="contract-tab-write"
        hidden={activeTab !== 'write'}
      >
        <ContractForm
          draft={draft}
          onChange={setDraft}
          importedFrom={importedFrom}
          onReset={() => {
            setDraft(createDraft());
            setImportedFrom(null);
          }}
        />
      </div>
      <div
        id="contract-panel-upload"
        role="tabpanel"
        aria-labelledby="contract-tab-upload"
        hidden={activeTab !== 'upload'}
      >
        <ContractUpload onApply={applyImported} />
      </div>
    </div>
  );
}
