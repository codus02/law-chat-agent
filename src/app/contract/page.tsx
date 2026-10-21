import type { Metadata } from 'next';
import { BackLink, ContentWrap, LawDateBadge, PageHeading } from '@/components/common/PageParts';
import { ContractStudio, type ContractTab } from '@/components/contract/ContractStudio';

export const metadata: Metadata = {
  title: '근로계약서 작성·점검',
};

export default async function ContractPage({ searchParams }: PageProps<'/contract'>) {
  const { tab } = await searchParams;
  const initialTab: ContractTab = tab === 'upload' ? 'upload' : 'write';

  return (
    <ContentWrap>
      <BackLink />
      <PageHeading
        title="근로계약서 작성·점검"
        description="고용노동부 표준근로계약서 항목을 채우면 최저임금·휴게·주휴일 같은 조건을 바로 확인해요. 이미 받은 계약서는 올려서 같은 기준으로 점검해요."
        aside={<LawDateBadge />}
      />
      <ContractStudio initialTab={initialTab} />
    </ContentWrap>
  );
}
