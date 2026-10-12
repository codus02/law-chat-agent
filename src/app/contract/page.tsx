import type { Metadata } from 'next';
import { BackLink, ContentWrap, LawDateBadge, PageHeading } from '@/components/common/PageParts';
import { ContractWorkspace, type ContractTab } from '@/components/contract/ContractWorkspace';

export const metadata: Metadata = {
  title: '근로계약서 작성·점검',
};

export default async function ContractPage({ searchParams }: PageProps<'/contract'>) {
  const { tab } = await searchParams;
  const initialTab: ContractTab = tab === 'upload' || tab === 'write' ? tab : 'checklist';

  return (
    <ContentWrap>
      <BackLink />
      <PageHeading
        kicker="CONTRACT GUIDE"
        title="근로계약서 작성·점검"
        description="근로조건을 확인하고, 표준근로계약서 항목에 맞춰 작성하거나 받은 계약서를 올려 살펴보세요."
        aside={<LawDateBadge />}
      />
      <ContractWorkspace initialTab={initialTab} />
    </ContentWrap>
  );
}
