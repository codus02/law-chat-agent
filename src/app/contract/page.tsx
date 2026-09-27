import type { Metadata } from 'next';
import { BackLink, ContentWrap, LawDateBadge, PageHeading } from '@/components/common/PageParts';
import { ContractWorkspace, type ContractTab } from '@/components/contract/ContractWorkspace';

export const metadata: Metadata = {
  title: '근로계약 점검',
};

export default async function ContractPage({ searchParams }: PageProps<'/contract'>) {
  const { tab } = await searchParams;
  const initialTab: ContractTab = tab === 'upload' ? 'upload' : 'checklist';

  return (
    <ContentWrap>
      <BackLink />
      <PageHeading
        kicker="CONTRACT CHECK"
        title="근로계약 점검"
        description="서명 전에 근로조건을 직접 확인하거나, 받은 계약서를 올려 살펴보세요."
        aside={<LawDateBadge />}
      />
      <ContractWorkspace initialTab={initialTab} />
    </ContentWrap>
  );
}
