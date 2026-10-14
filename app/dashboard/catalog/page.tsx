import { redirect } from 'next/navigation';
import { loadCatalog } from '@/lib/server/loaders/catalog';
import { pageSession } from '@/lib/server/session';
import CatalogClient from './CatalogClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'المنتجات والخدمات · هُدهُد' };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { business } = await pageSession();
  if (!business) redirect('/onboarding');
  const { tab } = await searchParams;
  return <CatalogClient data={await loadCatalog(business)} initialTab={tab === 'services' ? 'service' : 'product'} />;
}
