import 'server-only';
import { bookableMembers } from '@/lib/team';
import type { BusinessRow } from '../business';
import { catalogFor, membersFor } from './shared';

export async function loadCatalog(business: BusinessRow) {
  const [items, members] = await Promise.all([catalogFor(business.id), membersFor(business.id)]);
  return { items, staff: bookableMembers(members), offers: business.offers, sections: business.sections };
}
export type CatalogData = Awaited<ReturnType<typeof loadCatalog>>;
