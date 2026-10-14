import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { dismissSuggestionSchema } from '@/lib/validation/faq';

export const POST = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const { key } = await parseBody(req, dismissSuggestionSchema);
  const next = business.dismissedFaqSuggestions.includes(key) ? business.dismissedFaqSuggestions : [...business.dismissedFaqSuggestions, key];
  await db().update(schema.businesses).set({ dismissedFaqSuggestions: next }).where(eq(schema.businesses.id, business.id));
  return json({ dismissed: next });
});
