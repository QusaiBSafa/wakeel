import { handler, json, requireBusiness } from '@/lib/server/api';
import { loadState } from '@/lib/server/state';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const { business } = await requireBusiness();
  return json(await loadState(business));
});
