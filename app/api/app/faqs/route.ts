import { handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { createFaq, purgeFaqs } from '@/lib/server/faq-write';
import { faqCreateSchema } from '@/lib/validation/faq';

export const POST = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const body = await parseBody(req, faqCreateSchema);
  await purgeFaqs(business.id);
  return json(await createFaq(business.id, body), 201);
});
